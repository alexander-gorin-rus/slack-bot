import { Controller } from '@nestjs/common';
import { ActionsEnum } from '../../configs/actions';
import { VacationDayChange } from '../../database/entity/vacation-day-change.entity';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { convertDate } from '../../lib/functions';
import { Context } from '../../slack-bot/context/context';
import { Action } from '../../slack-bot/decorator/action.decorator';
import { View } from '../../slack-bot/decorator/view.decorator';
import { PlannedVacationsService } from './planned-vacations.service';
import { Messages } from '../../main/messages.service';
import { WebClient } from '@slack/web-api';
import { mkdown } from '../../templates/mkdown';
import { divider } from '../../templates/divider';
import { SellRequestService } from '../../database/service/sell.service';
import { VacationRequestStatus } from '../../database/util/vacation-request-status.enum';
import { SellRequestStatus } from '../../database/util/sell-request-status.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SentryOverwatch } from '../../main/sentry.overwatch';
import { VacationDayChangeService } from '../../database/service/vacation-day-change.service';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import {
	getKafkaDaysChangeData,
	getKafkaEmployeeRejectVacationData,
} from '../../kafka/utils/tranformers';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../../database/util/vacation-day-change-type-of-initiatior.enum';
import { settings } from '../../configs/settings';
import { captureException } from '../../_services/sentry';
import { EmailTemplatesService } from '../../email-templates/email-templates.service';
import { isSameDay } from 'date-fns';
import { CalendarService } from '../../calendar/calendar.service';
import { HelperService } from '../../main/helper.service';

@Controller('planned-vacation')
export class PlannedVacationController {
	constructor(
		private plannedVacationsService: PlannedVacationsService,
		private requestService: VacationRequestService,
		private messages: Messages,
		private client: WebClient,
		private sellRequestService: SellRequestService,
		private vacationRequestService: VacationRequestService,
		private vacationDayChangeService: VacationDayChangeService,
		private readonly kafkaService: KafkaService,
		private emailTemplatesService: EmailTemplatesService,
		private calendar: CalendarService,
		private helper: HelperService
	) {}

	// Слушатель открытия страницы(Заплавнированный отпуск)
	@Action(ActionsEnum.PLANNED_VACATIONS)
	async renderVacationList({ ack, views, user }: Context) {
		await ack();

		const fields = await this.plannedVacationsService.main(user);

		await views.publish({
			user_id: user.slackId,
			view: {
				type: 'home',
				blocks: [...fields],
			},
		});
	}

	// Слушатель кнопки(Отменить отпуск)
	@Action(ActionsEnum.DELETE_VACATION_ACTION)
	async chooseVacationToDelete({ ack, views, user, triggerId }: Context) {
		await ack();
		const view = await this.plannedVacationsService.selectVacation(user.id, triggerId);
		await views.open(view);
	}

	@View(ActionsEnum.DELETE_VAC_DECISION)
	async deleteVacDecsion({ ack, formData }: Context) {
		const view = await this.plannedVacationsService.decision(formData);
		await ack({ response_action: 'push', ...view });
	}
	// Слушатель кнопки модалки(Отправить запрос)
	@Action(ActionsEnum.DELETE_VACATION_BY_ID)
	async modalConfirm({ views, ack, user, actionData, say, viewId }: Context) {
		const request = await this.requestService.getById(Number(actionData), [
			'confirms',
			'confirms.manager',
			'employee',
			'employee.head',
		]);
		if (!request.status.includes('reject')) {
			const daysToRequest = await this.calendar.getWorkDays(request.from);
			if (daysToRequest < settings.minDaysBeforeVacation) {
				const view = this.plannedVacationsService.cancel();
				await views.update({ view_id: viewId, view });
				return;
			}

			const view = await this.plannedVacationsService.confirmingDeleteModal({
				vacationReqId: request.id,
				say,
				user,
			});

			request.status = VacationRequestStatus.REJECTED_EMPLOYEE;
			request.isRejectVacation = true;
			await this.kafkaService.sendMessage(
				TOPICS_LIST.EMPLOYEE_VACATION_CANCEL,
				getKafkaEmployeeRejectVacationData(request, user)
			);
			await this.requestService.delete(request.id);
			const emails = [];
			const slackIds = [];
			request.confirms.map((item) => {
				slackIds.push(item.manager.slackId);
				emails.push(item.manager.email);
			});

			await this.requestService.transaction(async (em) => {
				const change = new VacationDayChange();
				change.employee = user;
				change.days = request.days;
				change.reason = this.messages(
					'Отменен отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}}, c {from, date, long}',
					request
				);
				change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION_CANCEL;
				change.globalId = request.globalId;
				await em.save(change);
				await this.kafkaService.sendMessage(
					TOPICS_LIST.DAYS_CHANGE,
					getKafkaDaysChangeData(change)
				);
			});

			if (user.head && !slackIds.includes(user.head.slackId)) {
				slackIds.push(user.head.slackId);
			}

			await this.plannedVacationsService.postManagerMessage(request, slackIds, user);

			const emailList = [];

			emailList.push(request.employee.email);

			this.emailTemplatesService.sendEmailVacationCancelForFinDep([], request);
			this.emailTemplatesService.sendEmailVacationCancelForEmployee(emailList, request);

			const sellRequest = await this.sellRequestService.findPlannedAfterVacRequest(request.id);

			if (sellRequest) {
				sellRequest.status = SellRequestStatus.REJECTED_EMPLOYEE;
				await this.sellRequestService.save(sellRequest);
				await this.sellRequestService.transaction(async (em) => {
					const change = new VacationDayChange();
					change.employee = user;
					change.days = sellRequest.days;
					change.reason = this.messages(
						'Отменена продажа {days} {days, plural, one {дня} few {дней} many {дней} other {}}, c {from, date, long}',
						sellRequest
					);
					change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_SALE_CANCEL;
					change.globalId = sellRequest.globalId;
					await em.save(change);
					await this.kafkaService.sendMessage(
						TOPICS_LIST.DAYS_CHANGE,
						getKafkaDaysChangeData(change)
					);
				});
				const emailList = [];
				emailList.push(sellRequest.employee.email);

				this.emailTemplatesService.sendEmailSellCancelForFinDep([], sellRequest);
				this.emailTemplatesService.sendEmailSellCancelForEmployee(emailList, sellRequest);

				await this.client.chat.postMessage({
					text: 'Продажа дней',
					channel: user.slackId,
					blocks: [
						mkdown(
							this.messages(
								'Я отправил твой запрос на отмену продажи на {days} {days, plural, one {день} few {дня} many {дней} other {}} отпуска, c {from, date, long}',
								{
									days: sellRequest.days,
									from: sellRequest.from,
								}
							)
						),
						mkdown(
							`:money_with_wings: _Запрос на отмену продажи от: ${convertDate(
								this.calendar.today()
							)}_`
						),
						divider(),
					],
				});
			}

			await views.update({ view_id: viewId, view });
			await this.renderVacationList({ ack, views, user });
		} else {
			const view = this.plannedVacationsService.vacationAlreadyDeleted(request);
			await views.update({ view_id: viewId, view });
		}
	}

	@Action(ActionsEnum.DELETE_VACATION_ELEVEN_DAYS)
	async deleteVacElevenDays({ ack, user, actionData, messageId, channelId }: Context) {
		await ack();
		const request = await this.requestService.getById(Number(actionData), [
			'confirms',
			'confirms.manager',
			'employee',
			'employee.head',
		]);
		await this.client.chat.update({
			text: 'Запрос на отпуск',
			channel: channelId,
			ts: messageId,
			blocks: [
				mkdown(this.messages('Привет, <@{emp}>!', { emp: request.employee.slackId })),
				mkdown(
					this.messages('Твой отпуск, назначенный на {from}, отменен по твоему решению.', {
						from: request.from,
					})
				),
				divider(),
			],
		});
		await this.requestService.delete(request.id);
		const emails = [];
		const slackIds = [];
		request.confirms.map((item) => {
			slackIds.push(item.manager.slackId);
			emails.push(item.manager.email);
		});
		await this.requestService.transaction(async (em) => {
			const change = new VacationDayChange();
			change.employee = user;
			change.days = request.days;
			change.reason = this.messages(
				'Отменен отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}}, c {from, date, long}',
				request
			);
			change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION_CANCEL;
			change.globalId = request.globalId;
			await em.save(change);
			await this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));
		});

		if (user.head) {
			slackIds.push(user.head.slackId);
		}

		await this.plannedVacationsService.postManagerMessage(request, slackIds, user);

		const emailList = [];
		let pmEmailList;

		if (request.employee.pmApprove) {
			pmEmailList = request.confirms.map((pm) => pm.manager.email);
			emailList.push(...pmEmailList);
		}

		if (user.head) {
			emailList.push(request.employee.head.email);
		}

		emailList.push(request.employee.email);

		this.emailTemplatesService.sendEmailVacationCancelForFinDep([], request);
		this.emailTemplatesService.sendEmailVacationCancelForEmployee(emailList, request);

		const sellRequest = await this.sellRequestService.findPlannedAfterVacRequest(request.id);
		if (sellRequest) {
			await this.sellRequestService.delete(request.id);
			await this.sellRequestService.transaction(async (em) => {
				const change = new VacationDayChange();
				change.employee = user;
				change.days = request.days;
				change.reason = this.messages(
					'Отменена продажа {days} {days, plural, one {дня} few {дней} many {дней} other {}}, c {from, date, long}',
					request
				);
				change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_SALE_CANCEL;
				change.globalId = sellRequest.globalId;
				await em.save(change);
				await this.kafkaService.sendMessage(
					TOPICS_LIST.DAYS_CHANGE,
					getKafkaDaysChangeData(change)
				);
			});
			const emailList = [];
			emailList.push(request.employee.email);

			this.emailTemplatesService.sendEmailSellCancelForFinDep([], sellRequest);
			this.emailTemplatesService.sendEmailSellCancelForEmployee(emailList, sellRequest);

			await this.client.chat.postMessage({
				text: 'Продажа дней',
				channel: user.slackId,
				blocks: [
					mkdown(
						this.messages(
							'Я отправил твой запрос на отмену продажи на {days} {days, plural, one {день} few {дня} many {дней} other {}} отпуска, c {from, date, long}',
							{
								days: sellRequest.days,
								from: sellRequest.from,
							}
						)
					),
					mkdown(
						`:money_with_wings: _Запрос на отмену продажи от: ${convertDate(
							this.calendar.today()
						)}_`
					),
					divider(),
				],
			});
		}
	}

	@Action(ActionsEnum.APPROVE_VACATION_EMPLOYEE)
	async approveVacation({ ack, actionData, messageId, channelId }: Context) {
		await ack();
		const request = await this.requestService.getById(Number(actionData), [
			'confirms',
			'confirms.manager',
			'employee',
			'employee.head',
		]);
		request.approve = true;
		await this.requestService.save(request);
		await this.client.chat.update({
			text: 'Запрос на отпуск',
			channel: channelId,
			ts: messageId,
			blocks: [
				mkdown(this.messages('Привет, <@{emp}>!', { emp: request.employee.slackId })),
				mkdown(
					this.messages(
						'Я отправил письмо в отдел финансов для оформления документов на отпуск с {from, date, long}',
						{ from: new Date(request.from) }
					)
				),
				divider(),
			],
		});

		this.emailTemplatesService.sendEmailVacationApproveUntilTwoWeekForFinDep([], request);
	}

	@Cron(CronExpression.EVERY_DAY_AT_6PM) // 21:00 Moscow time
	@SentryOverwatch({ module: 'vacation', job: 'vacation-overdue' })
	async checkOverdueVacations() {
		const currentDate = this.calendar.today();
		const awaitingVacationRequests = await this.vacationRequestService.findAwaitingRequests();

		awaitingVacationRequests.forEach(async (vacationRequest) => {
			const isDaysMatch = isSameDay(new Date(vacationRequest.from), currentDate);
			if (!isDaysMatch) return;

			try {
				await this.vacationRequestService.changeAwaitingStatusToAutoReject(vacationRequest.id);
				const change = new VacationDayChange();
				change.employeeId = vacationRequest.employeeId;
				change.reason = this.messages(
					'Отпуск отменен автоматически в связи с тем, что не был утвержден до даты начала.',
					vacationRequest
				);
				change.days = vacationRequest.days;
				change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION_CANCEL;
				change.globalId = vacationRequest.globalId;
				change.createdAt = new Date();
				await this.vacationDayChangeService.save(change);
				this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));

				await this.client.chat.postMessage({
					text: 'Автоотмена отпуска',
					channel: vacationRequest.employee.slackId,
					blocks: [
						mkdown(
							this.messages(
								'<@{emp}>, твой отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from , date, long}' +
									' по {to , date, long} отменен системой, поскольку не был согласован руководителями до даты начала.' +
									' Если нужна помощь с этим запросом, пожалуйста, свяжись с руководителем или HR-отделом',
								{
									emp: vacationRequest.employee.slackId,
									days: vacationRequest.days,
									from: vacationRequest.from,
									to: vacationRequest.to,
								}
							)
						),
						divider(),
					],
				});

				const lpr = await this.helper.getLprRecursively(vacationRequest.employee);
				this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_VACATION_CANCEL,
					getKafkaEmployeeRejectVacationData(vacationRequest, lpr)
				);
			} catch (error) {
				captureException(error, { module: 'vacation', job: 'vacation-overdue' });
			}
		});
	}
}
