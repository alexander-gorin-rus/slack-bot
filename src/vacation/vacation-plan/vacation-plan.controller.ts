import { Controller } from '@nestjs/common';
import { Action } from '../../slack-bot/decorator/action.decorator';
import { ActionsEnum } from '../../configs/actions';
import { Context } from '../../slack-bot/context/context';
import { mkdown } from '../../templates/mkdown';
import { ViewsOpenArguments, WebClient } from '@slack/web-api';
import { HardValidatorService } from './hard-validator.service';
import { SoftValidatorService } from './soft-validator.service';
import { ViewService } from './view.service';
import { View } from '../../slack-bot/decorator/view.decorator';
import { VacationPlanInterface } from './vacation-plan.interface';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { EmployeeService } from '../../database/service/employee.service';
import { VacationRequestConfirm } from '../../database/entity/vacation-request-confirm.entity';
import { VacationRequestStatus } from '../../database/util/vacation-request-status.enum';
import { VacationDayChange } from '../../database/entity/vacation-day-change.entity';
import { CalendarService } from '../../calendar/calendar.service';
import { Messages } from '../../main/messages.service';
import { divider } from '../../templates/divider';
import { SellRequestService } from '../../database/service/sell.service';
import { settings, MAX_VAC_DAYS, MAX_VAC_DAYS_PER_YEAR } from '../../configs/settings';
import { SellRequest } from '../../database/entity/sell.entity';
import { SellRequestStatus } from '../../database/util/sell-request-status.enum';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import {
	getKafkaDaysChangeData,
	getKafkaEmployeeVacationCreateOrFinalData,
} from '../../kafka/utils/tranformers';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../../database/util/vacation-day-change-type-of-initiatior.enum';
import { VacationPlanService } from './vacation-plan.service';
import { SlackMessagesServices } from '../../main/slack-messages.service';
import { isSomePMSelected } from '../../utils';
import { messageFormat } from '../../utils';
import { HelperService } from '../../main/helper.service';
import {
	addDays,
	convertDate,
	format_yyyy_mm_dd,
	round,
	subDays,
	addAnotherDays,
} from '../../lib/functions';

@Controller('vacation-plan')
export class VacationPlanController {
	constructor(
		private hardValidator: HardValidatorService,
		private softValidator: SoftValidatorService,
		private viewService: ViewService,
		private requestService: VacationRequestService,
		private requestSellService: SellRequestService,
		private employeeService: EmployeeService,
		private helper: HelperService,
		private slackMessages: SlackMessagesServices,
		private calendar: CalendarService,
		private client: WebClient,
		private messages: Messages,
		private sellRequestService: SellRequestService,
		private readonly kafkaService: KafkaService,
		private readonly vacationPlanService: VacationPlanService
	) {}

	@Action(ActionsEnum.VACATION_PLAN_REDIRECT)
	async vacationPlanRedirect({ ack, messageId, channelId, views, user, triggerId }: Context) {
		await this.client.chat.update({
			channel: channelId,
			ts: messageId,
			text: 'Большое количество отпускных дней',
			blocks: [
				mkdown(
					this.messages(
						'Привет, <@{employee}>! У тебя накопилось большое количество отпускных дней - {days}.' +
							'\nТы можешь пойти в отпуск или продать эти отпускные дни.',
						{ employee: user.slackId, days: round(user.days) }
					)
				),
				divider(),
			],
		});
		await this.modal({ ack, views, user, triggerId });
	}

	@Action(ActionsEnum.VACATION_PLAN)
	async modal({ ack, user, views, triggerId }: Context<VacationPlanInterface>): Promise<void> {
		await ack();
		const pmList = await this.employeeService.getPmOptionList();
		const view = this.viewService.main(user, pmList);
		await views.open({ trigger_id: triggerId, view });
	}

	@View(ActionsEnum.VACATION_PLAN)
	async plan({ ack, user, formData }: Context<VacationPlanInterface>): Promise<void> {
		const reqYear = new Date(formData.date).getFullYear();
		const isYearConfigured = await this.calendar.isYearConfigured(reqYear);

		if (!isYearConfigured) {
			await ack({
				response_action: 'errors',
				errors: {
					date: `К сожалению, планирование отпуска на ${reqYear} год невозможно, поскольку не настроен производственный календарь. Свяжись с любым из hr-ов за помощью.`,
				},
			});
			return;
		}

		let anotherDays = 0;
		// Проверка на ошибки
		if (!user.SPStatus) {
			anotherDays = addAnotherDays(Number(formData.days));
			formData.startDate = format_yyyy_mm_dd(subDays(new Date(formData.date), anotherDays));
			formData.addAnotherDays = anotherDays;
		}
		const reqDays = formData.days;
		const prodCalendarVacation = await this.helper.prodCalendarCalculator(
			formData.date,
			Number(formData.days),
			'vac'
		);
		const endVacationDate = addDays(formData.date, prodCalendarVacation.to + Number(reqDays) - 1);
		const startSellDate = addDays(endVacationDate, 1);
		const prodCalendarSellDays = await this.helper.prodCalendarCalculator(
			startSellDate,
			Number(formData.addAnotherDays),
			'vac'
		);

		if (!prodCalendarVacation.decision) {
			await ack({ response_action: 'errors', errors: { date: prodCalendarVacation.reason } });
			return;
		}

		if (!prodCalendarSellDays.decision) {
			await ack({ response_action: 'errors', errors: { date: prodCalendarSellDays.reason } });
			return;
		}

		const errors = await this.hardValidator.validate(
			formData,
			user,
			prodCalendarVacation.to + anotherDays + prodCalendarSellDays.to
		);

		if (errors) {
			await ack({ response_action: 'errors', errors });
			return;
		}

		// Проверка на предупреждения
		formData.addDays = prodCalendarVacation.to;
		formData.sellHolidaysDays = prodCalendarSellDays.to;
		formData.sellDays = anotherDays;
		const warnings = (
			await this.softValidator.validate(
				formData,
				user,
				anotherDays,
				prodCalendarVacation.to,
				prodCalendarSellDays.to
			)
		).map((message) => mkdown(message));

		const view = (await this.viewService.confirm(
			reqDays,
			formData,
			warnings
		)) as ViewsOpenArguments;
		const yearVacationRequest = new Date(formData.date).getFullYear();

		// getting all approved vacations with compare year of Vacation Request
		const approvedVacations = await this.requestService.findApprovedVacReqs(
			user.id,
			yearVacationRequest
		);

		const approvedSells = await this.sellRequestService.findApprovedSellReqs(
			user.id,
			yearVacationRequest
		);

		const approvedSellWithVacation = await this.sellRequestService.findApprovedSellWithVac(
			user.id,
			yearVacationRequest
		);

		let check = true;

		if (round(user.days) >= MAX_VAC_DAYS) {
			check = true;

			approvedVacations.length &&
				approvedVacations &&
				approvedVacations.forEach((vacation) => {
					if (vacation.days >= MAX_VAC_DAYS) {
						check = false;
					}
				});

			approvedSells.length &&
				approvedSells &&
				approvedSells.forEach((sell) => {
					if (sell.days >= MAX_VAC_DAYS) {
						check = false;
					}
				});

			if (approvedSellWithVacation.length && approvedSellWithVacation && approvedSellWithVacation) {
				check = false;
			}
		}

		// calculation days vacancy and sell vacancy days
		const vacations = await this.requestService.findVacationRequestsForYear(user, true);
		const sellVacations = await this.requestSellService.findSellRequestsForYear(user, true);

		const vacationDays = [...vacations, ...sellVacations];

		const isVacationTwoWeeks = !!vacationDays.find(
			(vacation) => vacation.days === settings.twoWeek
		);
		const countVacancyDay = vacationDays.reduce(
			(previousValue, currentValue) => previousValue + currentValue.days,
			0
		);

		if (
			vacations.length === 0 &&
			check &&
			!isVacationTwoWeeks &&
			countVacancyDay <= MAX_VAC_DAYS_PER_YEAR
		) {
			await this.viewService.offerSaleVacationDays(formData, user, view);
		}

		// Сохранение формы
		view.private_metadata = formData.getPrivateMetadata();
		await ack({ response_action: 'push', view });
	}

	@View('vacation_send')
	async send({ ack, user, formData }: Context<VacationPlanInterface>): Promise<void> {
		const request = new VacationRequest();
		request.from = new Date(formData.date);
		request.days = Number(formData.days);
		request.employee = user;
		if (!formData.sellDays) {
			request.to = addDays(formData.date, Number(formData.days) - 1 + Number(formData.addDays));
		} else {
			request.to = addDays(formData.date, Number(request.days) - 1 + Number(formData.addDays));
		}

		if (isSomePMSelected(formData.pmSlackIds)) {
			const PMList = (
				await Promise.all(
					formData.pmSlackIds.map((slackId) => this.employeeService.getBySlackId(slackId))
				)
			).filter((i) => i);
			request.confirms = PMList.map((employee) => {
				const confirm = new VacationRequestConfirm();
				confirm.vacationRequest = request;
				confirm.manager = employee;
				return confirm;
			});
		} else {
			request.confirms = [];
			request.status = VacationRequestStatus.HEAD_ONLY_REQUEST;
		}

		let sellRequest;
		await this.requestService.transaction(async (em) => {
			const requestVacation = await em.save(request);
			await this.kafkaService.sendMessage(
				TOPICS_LIST.EMPLOYEE_VACATION_CREATED,
				getKafkaEmployeeVacationCreateOrFinalData(request, request.employee)
			);

			const date = convertDate(request.from);
			const change = new VacationDayChange();
			change.employee = request.employee;
			change.days = -1 * request.days;
			change.reason = messageFormat(
				'Отпуск с {date} на {days} {days, plural, one {день} few {дня} many {дней} other {}}',
				{ days: request.days, date }
			);
			change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION;
			change.globalId = requestVacation.globalId;
			if (formData.sellDays) {
				sellRequest = new SellRequest();
				sellRequest.days = formData.sellDays;
				sellRequest.employeeId = user.id;
				sellRequest.status = SellRequestStatus.ADDED_WITH_VACATION;
				sellRequest.vacationId = requestVacation.id;

				sellRequest.from = format_yyyy_mm_dd(addDays(request.to, 1));
				sellRequest.to = format_yyyy_mm_dd(addDays(request.to, Number(formData.sellDays)));

				await this.sellRequestService.save(sellRequest);
			}
			await em.save(change);
			await this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));
		});
		const msg = this.slackMessages.vacationPlannedMessage(user.slackId, request, sellRequest);
		await this.client.chat.postMessage(msg);
		const view = this.viewService.done(request);
		await ack({ response_action: 'push', view });
	}
}
