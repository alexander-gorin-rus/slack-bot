import { Controller, Post, Body, Get } from '@nestjs/common';
import { ViewsOpenArguments, WebClient } from '@slack/web-api';
import { ActionsEnum } from '../configs/actions';
import { SellRequest } from '../database/entity/sell.entity';
import { SellRequestService } from '../database/service/sell.service';
import { VacationDayChangeService } from '../database/service/vacation-day-change.service';
import { EmailSender } from '../main/email-message-option.interface';
import { EmailTpl } from '../main/email-tpl.decorator';
import { HelperService } from '../main/helper.service';
import { Messages } from '../main/messages.service';
import { Context } from '../slack-bot/context/context';
import { Action } from '../slack-bot/decorator/action.decorator';
import { View } from '../slack-bot/decorator/view.decorator';
import { HardValidatorService } from './hard-validator.service';
import { SellService } from './sell.service';
import { VacationRequestService } from '../database/service/vacation-request.service';
import { VacationRequest } from '../database/entity/vacation-request.entity';
import { VacationRequestStatus } from '../database/util/vacation-request-status.enum';
import { VacationDayChange } from '../database/entity/vacation-day-change.entity';
import { VacationRequestConfirm } from '../database/entity/vacation-request-confirm.entity';
import { EmployeeService } from '../database/service/employee.service';
import { Employee } from '../database/entity/employee.entity';
import {
	SellRequestStatus,
	SellRequestStatusTranslation,
} from '../database/util/sell-request-status.enum';
import { mkdown } from '../templates/mkdown';
import { divider } from '../templates/divider';
import { ProdCalendarService } from '../database/service/production-calendar.service';
import { KafkaService } from '../kafka/kafka.service';
import { TOPICS_LIST } from '../configs/topics';
import { getKafkaDaysChangeData } from '../kafka/utils/tranformers';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../database/util/vacation-day-change-type-of-initiatior.enum';
import { messageFormat } from '../utils/messageFormat';
import { addDays, format_yyyy_mm_dd } from '../lib/functions';
import { setYear } from 'date-fns';
import { SlackMessagesServices } from '../main/slack-messages.service';
import { isSomePMSelected } from '../utils';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

@Controller('sell')
export class SellController {
	@EmailTpl('sellDaysFinDep') sellDaysFinDep: EmailSender;
	@EmailTpl('sellDaysEmployee') sellDaysEmployee: EmailSender;
	@EmailTpl('sellCancelForFinDep') sellCancelForFinDep: EmailSender;
	@EmailTpl('sellCancelForEmployee') sellCancelForEmployee: EmailSender;

	constructor(
		private sellService: SellService,
		private helper: HelperService,
		private slackMessages: SlackMessagesServices,
		private hardValidator: HardValidatorService,
		private client: WebClient,
		private DayChange: VacationDayChangeService,
		private messages: Messages,
		private sellRequestService: SellRequestService,
		private vacationRequestService: VacationRequestService,
		private employeeService: EmployeeService,
		private prodCalendar: ProdCalendarService,
		private kafkaService: KafkaService,
		private emailTemplatesService: EmailTemplatesService
	) {}

	@Get('/export')
	async export() {
		const records = await this.sellRequestService.export();
		return {
			records: records.map((rec) => ({
				...rec,
				status: SellRequestStatusTranslation.find((e) => e.value === rec.status)?.label,
			})),
		};
	}

	@Post('/rejectSellRequest')
	async rejectSellRequest(@Body() body: any) {
		const request = await this.sellRequestService.getById(body.id, ['employee']);
		request.status = SellRequestStatus.CANCELLED_BY_ADMIN;
		request.cancelReason = body.cancelReason;
		await this.sellRequestService.save(request);

		const emailList = [request.employee.email];

		this.emailTemplatesService.sendEmailSellCancelForFinDep([], request);
		this.emailTemplatesService.sendEmailSellCancelForEmployee(emailList, request);

		const vacationChange = new VacationDayChange();
		vacationChange.globalId = request.globalId;
		vacationChange.typeOfInitiator =
			VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_SALE_CANCEL_ADMIN;
		vacationChange.days = -request.days;
		vacationChange.employee = request.employee;
		vacationChange.reason = this.messages(
			'Отмена продажи отпуска на {days} {days, plural, one {дня} few {дней} many {дней} other {}} администратором',
			{ days: vacationChange.days }
		);
		await this.DayChange.save(vacationChange);

		this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(vacationChange));

		return request;
	}

	@Action(ActionsEnum.SELL_PLAN_REDIRECT)
	async planSellRedirect({ ack, messageId, channelId, views, user, triggerId }: Context) {
		await this.client.chat.update({
			channel: channelId,
			ts: messageId,
			text: 'Большое количество отпускных дней',
			blocks: [
				mkdown(
					this.messages(
						'Привет, <@{employee}>! У тебя накопилось большое количество отпускных дней - {days}.' +
							'\nТы можешь пойти в отпуск или продать эти отпускные дни.',
						{ employee: user.slackId, days: this.helper.round(user.days) }
					)
				),
				divider(),
			],
		});
		await this.planSell({ ack, views, user, triggerId });
	}

	@Action(ActionsEnum.SELL_PLAN)
	async planSell({ ack, views, user, triggerId }: Context) {
		await ack({});
		const view = this.sellService.sellView(user);
		await views.open({ trigger_id: triggerId, view });
	}

	@View(ActionsEnum.SELL_REQUEST)
	async sellRequest({ ack, user }: Context) {
		let view: ViewsOpenArguments;
		const days = this.helper.round(user.days);
		days < 1
			? (view = this.sellService.sellReject(days))
			: (view = this.sellService.sellPlan(days));
		await ack({ response_action: 'push', view });
	}

	@View(ActionsEnum.SELL_DAYS_ACTION)
	async sellDays({ ack, user, formData }: Context) {
		const reqYear = String(formData.date.getFullYear());
		const allowYear = await this.prodCalendar.findOne({
			year: reqYear,
			active: true,
		});

		if (!allowYear) {
			await ack({
				response_action: 'errors',
				errors: {
					date: `К сожалению, планирование продажи на ${reqYear} год невозможно, поскольку не настроен производственный календарь. Свяжись с любым из hr-ов за помощью.`,
				},
			});
			return;
		}
		const startDateCalculation = await this.helper.startDateCalculation(formData.date);
		const prodCalendar = await this.helper.prodCalendarCalculator(
			startDateCalculation.from,
			formData.days,
			'vac'
		);
		const daysToRequest = await this.helper.getWorkDays(formData.date);
		const workDate = await this.helper.getWorkDate(5);

		if (daysToRequest < 4) {
			await ack({
				response_action: 'errors',
				errors: {
					date: this.messages(
						'Выбери дату продажи дней отпуска не ранее, чем {minDate, date, long}',
						{
							minDate: workDate,
						}
					),
				},
			});
			return;
		}

		const add = daysToRequest + 1;
		const errors = await this.hardValidator.validate(formData, user, prodCalendar.to, add);

		if (errors) {
			await ack({ response_action: 'errors', errors });
			return;
		}

		if (prodCalendar.decision === false) {
			await ack({
				response_action: 'errors',
				errors: { date: prodCalendar.reason },
			});
			return;
		}
		formData.addDays = prodCalendar.to;

		const firstDay = new Date(user.firstDay);
		const currentYear = new Date().getFullYear();
		const today = new Date();

		// ok if first day in the past else decrement 1 year
		const theNearestPastFirstDay =
			setYear(firstDay, currentYear) < today
				? setYear(firstDay, currentYear)
				: setYear(firstDay, currentYear - 1);
		const theNearestFutureFirstDay = setYear(
			theNearestPastFirstDay,
			theNearestPastFirstDay.getFullYear() + 1
		);

		const allVacationRequests = await this.vacationRequestService.findApprovedVacReqsInPeriod(
			user.id,
			theNearestPastFirstDay,
			theNearestFutureFirstDay
		);

		const approvedSells = await this.sellRequestService.findApprovedSellReqsInPeriod(
			user.id,
			theNearestPastFirstDay,
			theNearestFutureFirstDay
		);

		const totalVacationDays = allVacationRequests.reduce(
			(days, vacation) => (days += vacation.days),
			0
		);
		const totalSelledDays = approvedSells.reduce((days, sell) => (days += sell.days), 0);

		// Попадает ли продажа отпуска в период до 15 числа
		const { isInFirstHalfOfTheMonth, prepaymentDaysCount } =
			await this.sellService.getPrepaymentDaysCount(formData);

		const view = await this.sellService.decision({
			days: formData.days,
			from: formData.date,
			startOffset: startDateCalculation.offset,
			isInFirstHalfOfTheMonth,
			prepaymentDaysCount,
			additionalDays: prodCalendar.to,
			firstDay,
			totalSelledDays,
			totalVacationDays,
			user,
		});
		formData.date = startDateCalculation.from;
		view.private_metadata = formData.getPrivateMetadata();
		await ack({ response_action: 'push', view });
	}

	@View(ActionsEnum.CONFRIM_SELL)
	async confirmSell({ ack, user, formData }: Context) {
		await ack({ response_action: 'clear' });

		const request = new SellRequest();
		request.from = formData.date;
		request.to = addDays(formData.date, Number(formData.days) + formData.addDays - 1);
		request.days = Number(formData.days);
		request.employee = user;
		const msg = this.sellService.message(
			user.slackId,
			formData.days,
			formData.date,
			new Date(request.to)
		);

		await this.sellRequestService.save(request);
		await this.client.chat.postMessage(msg);
		const change = await this.DayChange.add(user, -formData.days, 'Продажа отпускных дней');
		// it' need to getKafkaDaysChangeData
		change.employee.days = Math.round(change.employee.days) + Math.round(formData.days);
		change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_SALE;
		change.globalId = request.globalId;
		await this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));

		// Checking count selled vacation-days of user and send message to HEAD
		// if vacation days of user after selling is Zero
		const userAfterSellVacationDays = request.employee;
		const { days } = userAfterSellVacationDays;

		if (days < 1) {
			const head = await this.employeeService.getById(userAfterSellVacationDays.headId);
			await this.client.chat.postMessage(
				this.sellService.messageToHead({ head, userAfterSellVacationDays })
			);
		}

		this.sellDaysFinDep([], {
			request,
			from: this.messages('{from , date, long}', { from: formData.date }),
			to: this.messages('{to , date, long}', { to: request.to }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			days: this.messages(
				'{days} {days, plural, one {календарный день} few {календарных дня} many {календарных дней} other {}}',
				{ days: request.days }
			),
		});

		const { isInFirstHalfOfTheMonth, prepaymentDaysCount } =
			await this.sellService.getPrepaymentDaysCount(formData);

		this.sellDaysEmployee(user.email, {
			request,
			from: this.messages('{from , date, long}', { from: formData.date }),
			to: this.messages('{to , date, long}', { to: request.to }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			days: this.messages(
				'{days} {days, plural, one {календарный день} few {календарных дня} many {календарных дней} other {}}',
				{ days: request.days }
			),
			isInFirstHalfOfTheMonth,
			prepaymentDaysCount,
		});
	}

	@View(ActionsEnum.CONFRIM_SELL_AFTER_VAC)
	async confirmSellAfterVac({ ack, user, formData }: Context) {
		await ack({ response_action: 'clear' });
		const newVacationRequest = new VacationRequest();
		const actionDataSaleVacationDays = formData.actionDataSaleVacationDays;
		newVacationRequest.from = actionDataSaleVacationDays.startDate;
		newVacationRequest.days = Number(actionDataSaleVacationDays.days);
		newVacationRequest.to = formData.DateTo;
		newVacationRequest.employee = user;

		if (isSomePMSelected(actionDataSaleVacationDays.pmSlackIds)) {
			const PMList = (
				await Promise.all(
					actionDataSaleVacationDays.pmSlackIds.map((slackId) =>
						this.employeeService.getBySlackId(slackId)
					)
				)
			).filter((i) => i);
			newVacationRequest.confirms = PMList.map((employee: Employee) => {
				const confirm = new VacationRequestConfirm();
				confirm.vacationRequest = newVacationRequest;
				confirm.manager = employee;
				return confirm;
			});
		} else {
			newVacationRequest.confirms = [];
			newVacationRequest.status = VacationRequestStatus.HEAD_ONLY_REQUEST;
		}

		let vacationRequest: VacationRequest;

		await this.vacationRequestService.transaction(async (em) => {
			vacationRequest = await em.save(newVacationRequest);
			const date = this.helper.convertDate(newVacationRequest.from);
			const change = new VacationDayChange();
			change.employee = newVacationRequest.employee;
			change.days = -1 * newVacationRequest.days;
			change.reason = messageFormat(
				'Отпуск с {date} на {days} {days, plural, one {день} few {дня} many {дней} other {}}',
				{ days: newVacationRequest.days, date }
			);
			change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION;
			change.globalId = newVacationRequest.globalId;
			em.save(change);
			await this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));
		});

		const request = new SellRequest();
		request.from = formData.date;
		request.to = addDays(formData.date, Number(formData.days) + formData.addDays - 1);
		request.days = Number(formData.days);

		const sellRequestOffset = await this.helper.prodCalendarCalculator(
			request.from,
			request.days,
			'vac'
		);

		request.to = addDays(request.to, sellRequestOffset.to);

		request.vacationId = vacationRequest.id;
		request.status = SellRequestStatus.ADDED_WITH_VACATION;
		request.employee = user;
		const msg = this.slackMessages.vacationPlannedMessage(user.slackId, vacationRequest, request);
		await this.client.chat.postMessage(msg);
		await this.sellRequestService.save(request);
	}

	@Action(ActionsEnum.SELL_AFTER_PLAN_VACATION)
	async offerSellVacationDays({
		ack,
		actionData,
		formData,
		views,
		viewId,
		user,
	}: Context): Promise<any> {
		await ack();
		const actionDataSaleVacationDays = JSON.parse(actionData);
		const finishVacancyDate = addDays(
			actionDataSaleVacationDays.date,
			Number(actionDataSaleVacationDays.days) + actionDataSaleVacationDays.addDays - 1
		);

		const startSellDate = await this.sellService.sellAfterVacCalc(finishVacancyDate);
		const prodCalendar = await this.helper.prodCalendarCalculator(
			startSellDate,
			14 - actionDataSaleVacationDays.days,
			'vac'
		);

		const sellingDaysCount = 14 - actionDataSaleVacationDays.days;

		const sellEndDate = addDays(startSellDate, sellingDaysCount);

		const errors = await this.hardValidator.twoWeeksValidate(actionDataSaleVacationDays.date, user);

		const view = this.sellService.decisionAfterVacation(
			sellingDaysCount,
			format_yyyy_mm_dd(startSellDate),
			sellEndDate,
			errors
		);

		formData['days'] = 14 - actionDataSaleVacationDays.days;
		formData['date'] = startSellDate;
		formData.addDays = prodCalendar.to;
		formData.actionDataSaleVacationDays = actionDataSaleVacationDays;
		formData.DateTo = finishVacancyDate;
		view.private_metadata = formData.getPrivateMetadata();

		await views.update({ view_id: viewId, view });
	}
}
