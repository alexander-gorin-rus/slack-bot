import { Controller } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebClient } from '@slack/web-api';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { VacationRequestConfirmStatus } from '../../database/util/vacation-request-confirm-status.enum';
import { VacationRequestStatus } from '../../database/util/vacation-request-status.enum';
import { mkdown } from '../../templates/mkdown';
import { button } from '../../templates/button';
import { Context } from '../../slack-bot/context/context';
import { Action } from '../../slack-bot/decorator/action.decorator';
import { VacationRequestConfirmService } from '../../database/service/vacation-request-confirm.service';
import { EntityNotFoundException } from '../../database/util/entity-not-found.exception';
import { divider } from '../../templates/divider';
import { VacationDayChange } from '../../database/entity/vacation-day-change.entity';
import { SentryOverwatch } from '../../main/sentry.overwatch';
import { Messages } from '../../main/messages.service';
import { logger } from '../../app.logger';
import { convertDate } from '../../lib/functions';
import { ActionsEnum } from '../../configs/actions';
import { SellRequestService } from '../../database/service/sell.service';
import { SellRequestStatus } from '../../database/util/sell-request-status.enum';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import {
	getKafkaDaysChangeData,
	getKafkaEmployeeRejectVacationData,
	getKafkaEmployeeVacationApproveData,
	getKafkaEmployeeVacationCreateOrFinalData,
} from '../../kafka/utils/tranformers';
import { VacationRequestConfirm } from '../../database/entity/vacation-request-confirm.entity';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../../database/util/vacation-day-change-type-of-initiatior.enum';
import { captureException } from '../../_services/sentry';
import { NonWorkingDays } from '../../lib/interfaces';
import { EmailTemplatesService } from '../../email-templates/email-templates.service';
import { messageFormat } from '../../utils';
import { CalendarService } from '../../calendar/calendar.service';
import { EmployeeService } from '../../database/service/employee.service';

const APPROVE_CONFIRM_ACTION = 'approve_confirm_vacation_request';
const REJECT_CONFIRM_ACTION = 'reject_confirm_vacation_request';
const APPROVE_REQUEST_ACTION = 'approve_vacation_request';
const REJECT_REQUEST_ACTION = 'reject_vacation_request';

@Controller('vacation-approve')
export class VacationApproveController {
	constructor(
		private client: WebClient,
		private vacationRequestService: VacationRequestService,
		private vacationRequestConfirmService: VacationRequestConfirmService,
		private sellRequestService: SellRequestService,
		private messages: Messages,
		private readonly kafkaService: KafkaService,
		private emailTemplatesService: EmailTemplatesService,
		private calendar: CalendarService,
		private employeeService: EmployeeService
	) {}

	@Cron(CronExpression.EVERY_MINUTE)
	@SentryOverwatch({ module: 'vacation', job: 'mailing PMs' })
	async mailingPM() {
		const requests = await this.vacationRequestService.findNewRequests();

		for (const request of requests) {
			if (request) {
				if (request.confirms.length == 0) {
					request.status = VacationRequestStatus.APPROVED_ALL_PM;
					await this.vacationRequestService.save(request);
				} else {
					try {
						logger.info(`Created request in processing: ${request.id}`);
						for (const confirm of request.confirms) {
							const response = await this.client.chat.postMessage({
								text: 'Запрос на отпуск',
								channel: confirm.manager.slackId,
								blocks: [
									mkdown(
										this.messages(
											'<@{emp}> хочет взять отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
												' c {from, date, long} по {to, date, long}' +
												' Если вы ранее еще не обсуждали с сотрудником его отпуск, сделайте это сейчас.',
											{
												emp: request.employee.slackId,
												days: request.days,
												from: request.from,
												to: request.to,
											}
										)
									),
									button('Подтвердить', APPROVE_CONFIRM_ACTION, JSON.stringify(confirm.id)),
									button('Отклонить', REJECT_CONFIRM_ACTION, JSON.stringify(confirm.id)),
									divider(),
								],
							});
							confirm.messageTs = response.ts;
							confirm.status = VacationRequestConfirmStatus.WAIT;
							confirm.chanelId = response.channel;
						}
						request.status = VacationRequestStatus.WAIT_PM;
						await this.vacationRequestService.save(request);
					} catch (error) {
						captureException(error, { module: 'vacation', job: 'mailing PMs' });
					}
				}
			}
		}
	}

	@Cron(CronExpression.EVERY_MINUTE)
	async mailingUpdatePMandHead() {
		try {
			await this.mailingUpdatePM();
		} catch (error) {
			captureException(error, {
				module: 'vacation',
				job: 'mailing update PMs and Heads: PMs part',
			});
		}
		try {
			await this.mailingUpdateHead();
		} catch (error) {
			captureException(error, {
				module: 'vacation',
				job: 'mailing update PMs and Heads: Heads part',
			});
		}
	}

	async mailingUpdatePM() {
		const vacationRejectRequests = await this.vacationRequestService.findRejectRequests();

		if (vacationRejectRequests && vacationRejectRequests.length) {
			for (const request of vacationRejectRequests) {
				try {
					for (const confirm of request.confirms) {
						if (confirm.status !== VacationRequestConfirmStatus.APPROVED) {
							await this.client.chat.update({
								channel: confirm.chanelId,
								ts: confirm.messageTs,
								text: 'Запрос на отпуск',
								blocks: [
									mkdown(
										`<@${request.employee.slackId}> хочет взять отпуск на ${
											request.days
										} дней c ${convertDate(request.from)}. по ${convertDate(
											request.to
										)} Если вы ранее еще не обсуждали с сотрудником его отпуск, сделайте это сейчас.`
									),
									divider(),
								],
							});
						}
					}
					request.isRejectVacation = true;
					await this.vacationRequestService.save(request);
				} catch (error) {
					captureException(error, {
						module: 'vacation',
						job: 'mailing update PMs ',
					});
				}
			}
		}
	}

	@Action(APPROVE_CONFIRM_ACTION)
	async approveConfirm({
		actionData,
		say,
		ack,
		messageId,
		channelId,
		user,
	}: Context): Promise<void> {
		try {
			const confirm = await this.vacationRequestConfirmService.getById(Number(actionData), [
				'manager',
				'vacationRequest',
				'vacationRequest.confirms',
				'vacationRequest.employee',
				'vacationRequest.confirms.manager',
			]);

			const currentDate = this.calendar.today();

			if (new Date(confirm.vacationRequest.from) <= currentDate) {
				throw new Error('Отпуск просрочен');
			}

			if (
				confirm.status == VacationRequestConfirmStatus.WAIT &&
				confirm.vacationRequest.status == VacationRequestStatus.WAIT_PM
			) {
				confirm.status = VacationRequestConfirmStatus.APPROVED;
				const needConfirmNum = confirm.vacationRequest.confirms.filter(
					(confirm) => confirm.status == VacationRequestConfirmStatus.WAIT
				).length;

				if (needConfirmNum == 1) {
					confirm.vacationRequest.status = VacationRequestStatus.APPROVED_ALL_PM;
					await this.vacationRequestService.save(confirm.vacationRequest);
				}
				(await this.vacationRequestConfirmService.save(confirm)) as VacationRequestConfirm;
				await ack({});
				const updatedRequest = await this.vacationRequestService.getById(
					confirm.vacationRequest.id,
					['confirms', 'employee', 'employee.head', 'confirms.manager']
				);
				await this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_VACATION_APPROVED,
					getKafkaEmployeeVacationApproveData(updatedRequest)
				);

				const employeeSlackId = confirm.vacationRequest.employee.slackId;
				const requestFrom = confirm.vacationRequest.from;
				const requestTo = confirm.vacationRequest.to;
				const requestDays = confirm.vacationRequest.days;

				await this.client.chat.update({
					channel: channelId,
					ts: messageId,
					text: 'Запрос на отпуск',
					blocks: [
						mkdown(
							this.messages(
								'Отпуск <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
								{
									emp: employeeSlackId,
									days: requestDays,
									from: requestFrom,
									to: requestTo,
								}
							)
						),
						mkdown(`:white_check_mark: _Подтверждено ${convertDate(this.calendar.today())}_`),
						divider(),
					],
				});

				await this.client.chat.postMessage({
					text: 'Запрос на отпуск',
					channel: employeeSlackId,
					blocks: [
						mkdown(
							// eslint-disable-next-line max-len
							this.messages(
								'Твой отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long} согласован ПМом <@{pm}>',
								{
									days: requestDays,
									from: requestFrom,
									to: requestTo,
									pm: user.slackId,
								}
							)
						),
						mkdown(`:white_check_mark: _Подтверждено ${convertDate(this.calendar.today())}_`),
						divider(),
					],
				});
			}
		} catch (e) {
			if (e instanceof EntityNotFoundException) {
				await say(
					'Операция не может быть выполнена, обратись в поддержку бота - #support-employee-helper'
				);
			} else {
				throw e;
			}
		}
	}

	@Action(REJECT_CONFIRM_ACTION)
	async rejectConfirm({
		actionData,
		say,
		ack,
		messageId,
		channelId,
		user,
	}: Context): Promise<void> {
		try {
			const confirm = await this.vacationRequestConfirmService.getById(Number(actionData), [
				'manager',
				'vacationRequest',
				'vacationRequest.confirms',
				'vacationRequest.employee',
				'vacationRequest.confirms.manager',
			]);

			const currentDate = this.calendar.today();

			if (new Date(confirm.vacationRequest.from) <= currentDate) {
				throw new Error('Отпуск просрочен');
			}

			if (
				confirm.status == VacationRequestConfirmStatus.WAIT &&
				confirm.vacationRequest.status == VacationRequestStatus.WAIT_PM
			) {
				confirm.status = VacationRequestConfirmStatus.REJECTED;
				confirm.vacationRequest.status = VacationRequestStatus.REJECTED_PM;
				confirm.vacationRequest.isRejectVacation = true;

				await this.vacationRequestConfirmService.transaction(async (em) => {
					await this.vacationRequestService.save(confirm.vacationRequest);
					await this.vacationRequestConfirmService.save(confirm);

					const date = convertDate(confirm.vacationRequest.from);
					const change = new VacationDayChange();

					change.employee = confirm.vacationRequest.employee;
					change.days = confirm.vacationRequest.days;
					change.reason = messageFormat(
						'Отклонен отпуск с {date} на {days} {days, plural, one {день} few {дня} many {дней} other {}}',
						{ days: confirm.vacationRequest.days, date }
					);
					change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION_CANCEL;
					change.globalId = confirm.vacationRequest.globalId;
					change.createdAt = new Date();
					em.save(change);
					await this.kafkaService.sendMessage(
						TOPICS_LIST.DAYS_CHANGE,
						getKafkaDaysChangeData(change)
					);
				});

				// decline sellRequest
				const sellRequest = await this.sellRequestService.findOne(
					{ vacationId: confirm.vacationRequest.id },
					{ relations: ['employee'] }
				);
				if (sellRequest) {
					sellRequest.status = SellRequestStatus.REJECTED_EMPLOYEE;
					await this.sellRequestService.save(sellRequest);
				}

				await ack({});
				const updatedRequest = await this.vacationRequestService.getById(
					confirm.vacationRequest.id,
					['confirms', 'employee', 'employee.head', 'confirms.manager']
				);
				await this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_VACATION_CANCEL,
					getKafkaEmployeeRejectVacationData(updatedRequest, user)
				);

				const employeeSlackId = confirm.vacationRequest.employee.slackId;
				const requestFrom = confirm.vacationRequest.from;
				const requestTo = confirm.vacationRequest.to;
				const requestDays = confirm.vacationRequest.days;

				await this.client.chat.update({
					channel: channelId,
					ts: messageId,
					text: 'Запрос на отпуск',
					blocks: [
						mkdown(
							this.messages(
								'Отпуск <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
								{
									emp: employeeSlackId,
									days: requestDays,
									from: requestFrom,
									to: requestTo,
								}
							)
						),
						mkdown(`:x: _Отклонено ${convertDate(this.calendar.today())}_`),
						divider(),
					],
				});
				await this.client.chat.postMessage({
					text: 'Запрос на отпуск',
					channel: employeeSlackId,
					blocks: [
						mkdown(
							// eslint-disable-next-line max-len
							this.messages(
								'Твой отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long} отклонен ПМом <@{pm}>',
								{
									days: requestDays,
									from: requestFrom,
									to: requestTo,
									pm: user.slackId,
								}
							)
						),
						mkdown('Свяжись с ним/ней для получения дополнительной информации.'),
						mkdown(`:x: _Отклонено ${convertDate(this.calendar.today())}_`),
						divider(),
					],
				});
			}
		} catch (e) {
			if (e instanceof EntityNotFoundException) {
				await say(
					'Операция не может быть выполнена, обратись в поддержку бота - #support-employee-helper'
				);
			} else {
				throw e;
			}
		}
	}

	@Cron(CronExpression.EVERY_MINUTE)
	@SentryOverwatch({ module: 'vacation', job: 'mailing Head' })
	async mailingHead() {
		const requests = await this.vacationRequestService.findPMApprovedRequests();

		if (requests && requests.length) {
			for (const request of requests) {
				try {
					const blocks = [];

					if (request.confirms.length) {
						const pmSlackTags = request.confirms
							.filter((confirm) => confirm.status == VacationRequestConfirmStatus.APPROVED)
							.map((confirm) => `<@${confirm.manager.slackId}>`)
							.join(', ');

						if (pmSlackTags.length) {
							blocks.push(mkdown(`Согласовано и одобрено: ${pmSlackTags}`));
						}

						const autoApprove = request.confirms.filter(
							(confirm) => confirm.status == VacationRequestConfirmStatus.AUTO_APPROVE
						);

						if (autoApprove.length) {
							const autoPms = autoApprove
								.map((confirm) => `<@${confirm.manager.slackId}>`)
								.join(', ');
							// eslint-disable-next-line max-len
							blocks.push(
								mkdown(
									`Отпуск сотрудника согласован системой, поскольку ПМ ${autoPms} не ${
										autoApprove.length > 1 ? 'ответили' : 'ответил(а)'
									} на запрос сотрудника в течение 5 дней.`
								)
							);
						}
						this.kafkaService.sendMessage(
							TOPICS_LIST.EMPLOYEE_VACATION_CHANGE,
							getKafkaEmployeeVacationApproveData(request)
						);
					} else {
						blocks.push(mkdown('Сотрудник не запрашивал одобрения ПМов, так как у него их нет.'));
					}

					const headLPR = await this.employeeService.findLPR(request.employee.head);

					const response = await this.client.chat.postMessage({
						text: 'Запрос на отпуск',
						channel: headLPR.slackId,
						blocks: [
							mkdown(
								this.messages(
									'<@{emp}> хочет взять отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
									{
										emp: request.employee.slackId,
										days: request.days,
										from: request.from,
										to: request.to,
									}
								)
							),
							...blocks,
							button('Подтвердить', APPROVE_REQUEST_ACTION, JSON.stringify(request.id)),
							button('Отклонить', REJECT_REQUEST_ACTION, JSON.stringify(request.id)),
							divider(),
						],
					});

					request.channelId = response.channel;
					request.messageTs = response.ts;
					request.status = VacationRequestStatus.WAIT_HEAD;

					await this.vacationRequestService.save(request);
				} catch (error) {
					captureException(error, { module: 'vacation', job: 'mailing Head' });
				}
			}
		}
	}

	async mailingUpdateHead() {
		const vacationRejectRequests = await this.vacationRequestService.findRejectRequests();

		if (vacationRejectRequests && vacationRejectRequests.length) {
			for (const request of vacationRejectRequests) {
				try {
					await this.client.chat.update({
						text: 'Запрос на отпуск',
						channel: request.channelId,
						ts: request.messageTs,
						blocks: [
							mkdown(
								this.messages(
									`<@${request.employee.slackId}> хочет взять отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}}` +
										' c {from, date, long} по {to, date, long}',
									{ days: request.days, from: request.from, to: request.to }
								)
							),
							divider(),
						],
					});

					request.isRejectVacation = false;
					await this.vacationRequestService.save(request);
				} catch (error) {
					captureException(error, {
						module: 'vacation',
						job: 'mailing update Head',
					});
				}
			}
		}
	}

	@Action(APPROVE_REQUEST_ACTION)
	async approveRequest({
		actionData,
		say,
		ack,
		messageId,
		channelId,
		user,
	}: Context): Promise<void> {
		try {
			const request = await this.vacationRequestService.getById(Number(actionData), [
				'employee',
				'employee.head',
				'confirms',
				'confirms.manager',
			]);
			const reqYear = String(new Date(request.from).getFullYear());
			const allowYear = await this.calendar.getConfiguredYear(reqYear);
			const nonWorkingDays: NonWorkingDays = JSON.parse(allowYear.nonWorkingDays);

			if (request.status == VacationRequestStatus.WAIT_HEAD) {
				request.status = VacationRequestStatus.APPROVED_HEAD;

				await ack({});

				const employeeSlackId = request.employee.slackId;
				const requestDays = request.days;

				if (request.confirms.length != 0) {
					const pmSlackTags = request.confirms
						.map((confirm) => `<@${confirm.manager.slackId}>`)
						.join(', ');
					await this.client.chat.update({
						channel: channelId,
						ts: messageId,
						text: 'Запрос на отпуск',
						blocks: [
							mkdown(
								this.messages(
									'Отпуск <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
									{
										emp: request.employee.slackId,
										days: request.days,
										from: request.from,
										to: request.to,
									}
								)
							),
							mkdown(`Согласовано и одобрено: ${pmSlackTags}`),
							mkdown(`:white_check_mark: _Подтверждено ${convertDate(this.calendar.today())}_`),
							divider(),
						],
					});
				} else {
					await this.client.chat.update({
						channel: channelId,
						ts: messageId,
						text: 'Запрос на отпуск',
						blocks: [
							mkdown(
								this.messages(
									'Отпуск <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
									{
										emp: request.employee.slackId,
										days: request.days,
										from: request.from,
										to: request.to,
									}
								)
							),
							mkdown(`:white_check_mark: _Подтверждено ${convertDate(this.calendar.today())}_`),
							divider(),
						],
					});
				}

				await this.client.chat.postMessage({
					text: 'Запрос на отпуск',
					channel: employeeSlackId,
					blocks: [
						mkdown(
							this.messages(
								'Твой отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c' +
									' {from, date, long} по {to, date, long} согласован руководителем <@{pm}>',
								{
									days: requestDays,
									from: request.from,
									to: request.to,
									pm: user.slackId,
								}
							)
						),
						mkdown(`:white_check_mark: _Подтверждено ${convertDate(this.calendar.today())}_`),
						divider(),
					],
				});

				await this.vacationRequestService.save(request);
				await this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_VACATION_FINISH,
					getKafkaEmployeeVacationCreateOrFinalData(request, request.employee)
				);
				const emailList = [];
				let pmEmailList: string[];

				if (request.employee.pmApprove) {
					pmEmailList = request.confirms.map((pm) => pm.manager.email);
					emailList.push(...pmEmailList);
				}

				if (request.employee.head.isLPR === false) {
					const LPR = await this.employeeService.findLPR(request.employee.head);
					emailList.push(LPR.email);
				}

				emailList.push(request.employee.head.email);
				emailList.push(request.employee.email);

				this.emailTemplatesService.sendEmailVacationApproveForEmployee(emailList, request);

				const sellRequest = await this.sellRequestService.findPlannedAfterVacRequest(request.id);
				if (!sellRequest) {
					this.emailTemplatesService.sendEmailVacationApproveForFinDep([], request, nonWorkingDays);
				}

				if (sellRequest) {
					await this.client.chat.postMessage({
						text: 'Продажа дней',
						channel: request.employee.slackId,
						blocks: [
							mkdown(
								this.messages(
									'Запрос на допродажу {days} {days, plural, one {отпускного дня} few {отпускных дней} many {отпускных дней} other {}} отправлен.',
									{ days: sellRequest.days }
								)
							),
							mkdown(
								this.messages('Продажа будет оформлена с {from, date, long} по {to, date, long}', {
									from: sellRequest.from,
									to: sellRequest.to,
								})
							),
							mkdown(
								this.messages(':money_with_wings: Запрос на продажу от: {date, date, long}', {
									date: this.calendar.today(),
								})
							),
							divider(),
						],
					});
					await this.sellRequestService.transaction(async (em) => {
						sellRequest.status = SellRequestStatus.PLANNED;
						await this.sellRequestService.save(sellRequest);
						const sellChange = new VacationDayChange();
						sellChange.employee = request.employee;
						sellChange.days = -1 * sellRequest.days;
						sellChange.reason = 'Допродажа отпуска';
						sellChange.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_SALE;
						sellChange.globalId = sellRequest.globalId;
						sellChange.createdAt = new Date();
						em.save(sellChange);
						await this.kafkaService.sendMessage(
							TOPICS_LIST.DAYS_CHANGE,
							getKafkaDaysChangeData({ ...sellChange, days: sellChange.days } as VacationDayChange)
						);
					});

					this.emailTemplatesService.sendEmailSellVacationDaysAfterPlanning(
						[],
						sellRequest,
						request,
						nonWorkingDays
					);

					this.emailTemplatesService.sendEmailSellDaysEmployee(sellRequest);
				}
			}
		} catch (e) {
			if (e instanceof EntityNotFoundException) {
				await say(
					'Операция не может быть выполнена, обратись в поддержку бота - #support-employee-helper'
				);
			} else {
				throw e;
			}
		}
	}

	@Action(REJECT_REQUEST_ACTION)
	async rejectRequest({
		actionData,
		say,
		ack,
		messageId,
		channelId,
		user,
	}: Context): Promise<void> {
		try {
			const request = await this.vacationRequestService.getById(Number(actionData), [
				'employee',
				'employee.head',
				'confirms',
				'confirms.manager',
			]);

			if (request.status == VacationRequestStatus.WAIT_HEAD) {
				request.status = VacationRequestStatus.REJECTED_HEAD;
				request.isRejectVacation = true;
				await this.vacationRequestService.transaction(async (em) => {
					await this.vacationRequestService.save(request);
					const date = convertDate(request.from);

					const change = new VacationDayChange();
					change.employee = request.employee;
					change.days = request.days;
					change.reason = messageFormat(
						'Отклонен отпуск с {date} на {days} {days, plural, one {день} few {дня} many {дней} other {}}',
						{ days: request.days, date }
					);
					change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION_CANCEL;
					change.globalId = request.globalId;
					change.createdAt = new Date();
					em.save(change);
					await this.kafkaService.sendMessage(
						TOPICS_LIST.DAYS_CHANGE,
						getKafkaDaysChangeData(change)
					);
				});

				// decline sellRequest
				const sellRequest = await this.sellRequestService.findOne(
					{ vacationId: request.id },
					{ relations: ['employee'] }
				);
				if (sellRequest) {
					sellRequest.status = SellRequestStatus.REJECTED_EMPLOYEE;
					await this.sellRequestService.save(sellRequest);
				}

				await ack({});
				await this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_VACATION_CANCEL,
					getKafkaEmployeeRejectVacationData(request, user)
				);
				const employeeSlackId = request.employee.slackId;
				const requestDays = request.days;

				if (request.confirms.length != 0) {
					const pmSlackTags = request.confirms
						.map((confirm) => `<@${confirm.manager.slackId}>`)
						.join(', ');

					await this.client.chat.update({
						channel: channelId,
						ts: messageId,
						text: 'Запрос на отпуск',
						blocks: [
							mkdown(
								this.messages(
									'Отпуск <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
									{
										emp: request.employee.slackId,
										days: request.days,
										from: request.from,
										to: request.to,
									}
								)
							),
							mkdown(`Согласовано и одобрено: ${pmSlackTags}`),
							mkdown(`:x: _Отклонено ${convertDate(this.calendar.today())}_`),
							divider(),
						],
					});
				} else {
					await this.client.chat.update({
						channel: channelId,
						ts: messageId,
						text: 'Запрос на отпуск',
						blocks: [
							mkdown(
								this.messages(
									'Отпуск <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
									{
										emp: request.employee.slackId,
										days: request.days,
										from: request.from,
										to: request.to,
									}
								)
							),
							mkdown(`:x: _Отклонено ${convertDate(this.calendar.today())}_`),
							divider(),
						],
					});
				}
				if (request.confirms.length != 0) {
					request.confirms.map(async (confirm) => {
						await this.client.chat.postMessage({
							channel: confirm.manager.slackId,
							text: 'Запрос на отпуск',
							blocks: [
								mkdown(
									this.messages(
										'Отпуск <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
										{
											emp: request.employee.slackId,
											days: request.days,
											from: request.from,
											to: request.to,
										}
									)
								),
								mkdown(
									`Отклонен руководителем сотрудника <@${user.slackId}>. Просьба учитывать это в проектных планах.`
								),
								mkdown(`:x: _Отклонено ${convertDate(this.calendar.today())}_`),
								divider(),
							],
						});
					});
				} else {
					await this.client.chat.postMessage({
						text: 'Запрос на отпуск',
						channel: employeeSlackId,
						blocks: [
							mkdown(
								this.messages(
									'Твой отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long}' +
										' по {to, date, long} отклонен руководителем <@{pm}>',
									{
										days: requestDays,
										from: request.from,
										to: request.to,
										pm: user.slackId,
									}
								)
							),
							mkdown('Свяжись с ним/ней для получения дополнительной информации.'),
							mkdown(`:x: _Отклонено ${convertDate(this.calendar.today())}_`),
							divider(),
						],
					});
					await this.vacationRequestService.save(request);
				}
			}
		} catch (e) {
			if (e instanceof EntityNotFoundException) {
				await say(
					'Операция не может быть выполнена, обратись в поддержку бота - #support-employee-helper'
				);
			} else {
				throw e;
			}
		}
	}

	@Cron('0 13 * * *')
	@SentryOverwatch({ module: 'vacation', job: 'check PM response' })
	async checkPMResponse() {
		const requests = await this.vacationRequestService.findAwaitingRequests();
		const today = new Date(this.calendar.today().setHours(0, 0, 0, 0));
		const workDay = await this.calendar.prodCalendarCalculator(today, 1, 'vac');

		if (workDay) {
			if (requests.length) {
				requests.map(async (request) => {
					try {
						if (request.status === VacationRequestStatus.WAIT_PM) {
							request.confirms.map(async (pmConfirm) => {
								if (pmConfirm.status == VacationRequestConfirmStatus.WAIT) {
									if (pmConfirm.counter < 4) {
										await this.client.chat.postMessage({
											text: 'Запрос на отпуск',
											channel: pmConfirm.manager.slackId,
											thread_ts: pmConfirm.messageTs,
											blocks: [
												mkdown(
													this.messages(
														'Привет <@{pm}>! <@{employee}> ждет твоего решения по отпуску. Нажми на одну из кнопок выше :point_up_2:',
														{
															pm: pmConfirm.manager.slackId,
															employee: request.employee.slackId,
														}
													)
												),
												divider(),
											],
										});
										pmConfirm.counter++;
										await this.vacationRequestConfirmService.save(pmConfirm);
									} else if (pmConfirm.counter == 4) {
										const response = await this.client.chat.postMessage({
											text: 'Запрос на отпуск',
											channel: pmConfirm.manager.slackId,
											thread_ts: pmConfirm.messageTs,
											blocks: [
												mkdown(
													this.messages(
														'В связи с твоим молчанием отпуск <@{employee}> одобрен автоматически и отправлен на согласование руководителю сотрудника.',
														{ employee: request.employee.slackId }
													)
												),
												divider(),
											],
										});

										await this.client.chat.update({
											text: 'Запрос на отпуск',
											channel: response.channel,
											ts: pmConfirm.messageTs,
											blocks: [
												mkdown(
													this.messages(
														'Отпуск <@{employee}> на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
															'c {from, date, long} по {to, date, long}',
														{
															employee: request.employee.slackId,
															days: request.days,
															from: request.from,
															to: request.to,
														}
													)
												),
												mkdown(
													`:white_check_mark: _Подтверждено ${convertDate(this.calendar.today())}_`
												),
												divider(),
											],
										});

										await this.client.chat.postMessage({
											text: 'Запрос на отпуск',
											channel: request.employee.slackId,
											blocks: [
												mkdown(
													// eslint-disable-next-line max-len
													this.messages(
														'В связи с молчанием <@{pm}> отпуск одобрен автоматически.',
														{ pm: pmConfirm.manager.slackId }
													)
												),
												mkdown(
													this.messages(
														'Отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
														{
															days: request.days,
															from: request.from,
															to: request.to,
														}
													)
												),
												mkdown(
													`:white_check_mark: _Подтверждено ${convertDate(this.calendar.today())}_`
												),
												divider(),
											],
										});

										if (
											pmConfirm.status == VacationRequestConfirmStatus.WAIT &&
											request.status == VacationRequestStatus.WAIT_PM
										) {
											pmConfirm.status = VacationRequestConfirmStatus.AUTO_APPROVE;
											const needConfirmNum = request.confirms.filter(
												(confirm) => confirm.status == VacationRequestConfirmStatus.WAIT
											).length;

											if (needConfirmNum == 0) {
												request.status = VacationRequestStatus.APPROVED_ALL_PM;
												await this.vacationRequestService.save(request);
											}

											await this.vacationRequestConfirmService.save(pmConfirm);
										}
									}
								}
							});
						} else {
							if (request.counter < 4) {
								await this.client.chat.postMessage({
									text: 'Запрос на отпуск',
									thread_ts: request.messageTs,
									channel: request.employee.head.slackId,
									blocks: [
										mkdown(
											this.messages(
												'Привет <@{head}>! <@{employee}> ждет твоего решения по отпуску. Нажми на одну из кнопок выше :point_up_2:',
												{
													head: request.employee.head.slackId,
													employee: request.employee.slackId,
												}
											)
										),
										divider(),
									],
								});
								request.counter++;
								await this.vacationRequestService.save(request);
							} else if (request.counter == 4) {
								const response = await this.client.chat.postMessage({
									text: 'Запрос на отпуск',
									channel: request.employee.head.slackId,
									thread_ts: request.messageTs,
									blocks: [
										mkdown(
											this.messages(
												'В связи с твоим молчанием отпуск <@{employee}> отправлен на согласование твоему руководителю.',
												{ employee: request.employee.slackId }
											)
										),
										divider(),
									],
								});

								await this.client.chat.update({
									text: 'Запрос на отпуск',
									channel: response.channel,
									ts: request.messageTs,
									blocks: [
										mkdown(
											this.messages(
												'Отпуск <@{employee}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from} по {to}',
												{
													employee: request.employee.slackId,
													days: request.days,
													from: convertDate(request.from),
													to: convertDate(request.to),
												}
											)
										),
										mkdown(
											`:white_check_mark: _Подтверждено ${convertDate(this.calendar.today())}_`
										),
										divider(),
									],
								});

								await this.client.chat.postMessage({
									text: 'Запрос на отпуск',
									channel: request.employee.slackId,
									blocks: [
										mkdown(
											// eslint-disable-next-line max-len
											this.messages(
												'В связи с молчанием <@{head}> отпуск отправлен на одобрение <@{headOfHead}>.',
												{
													head: request.employee.head.slackId,
													headOfHead: request.employee.head.head.slackId,
												}
											)
										),
										mkdown(
											this.messages(
												'Отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from}',
												{
													days: request.days,
													from: convertDate(request.from),
												}
											)
										),
										divider(),
									],
								});

								await this.client.chat.postMessage({
									text: 'Запрос на отпуск',
									channel: request.employee.head.head.slackId,
									blocks: [
										mkdown(
											this.messages('Привет, <@{headOfHead}>!', {
												headOfHead: request.employee.head.head.slackId,
											})
										),
										mkdown(
											this.messages(
												'<@{head}> уже 5 дней не отвечает на запрос на отпуск <@{employee}>. Пожалуйста, согласуй отпуск.',
												{
													head: request.employee.head.slackId,
													employee: request.employee.slackId,
												}
											)
										),
										mkdown(
											this.messages(
												'Отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from} по {to}',
												{
													days: request.days,
													from: convertDate(request.from),
													to: convertDate(request.to),
												}
											)
										),
										button('Подтвердить', APPROVE_REQUEST_ACTION, JSON.stringify(request.id)),
										button('Отклонить', REJECT_REQUEST_ACTION, JSON.stringify(request.id)),
										divider(),
									],
								});

								request.counter++;
								await this.vacationRequestService.save(request);
							}
						}
					} catch (error) {
						captureException(error, {
							module: 'vacation',
							job: 'check PM response',
						});
					}
				});
			}
		}
	}

	@Cron(CronExpression.EVERY_DAY_AT_NOON)
	@SentryOverwatch({ module: 'vacation', job: 'check employee decision' })
	async checkEmployeeDecision() {
		const requests = await this.vacationRequestService.findHEADApprovedRequests();
		const today = new Date(this.calendar.today().setHours(0, 0, 0, 0));
		const { decision } = await this.calendar.prodCalendarCalculator(today, 1, 'vac');
		if (decision) {
			if (requests) {
				requests.map(async (request) => {
					try {
						const daysToRequest = await this.calendar.getWorkDays(request.from);

						if (daysToRequest == 11) {
							await this.client.chat.postMessage({
								text: 'Запрос на отпуск',
								channel: request.employee.slackId,
								blocks: [
									mkdown(
										this.messages('Привет, <@{emp}>!', {
											emp: request.employee.slackId,
										})
									),
									mkdown(
										this.messages(
											// eslint-disable-next-line max-len
											'Твой отпуск, назначенный на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {from, date, long} по {to, date, long}, начнется через 2 недели. Нажми на кнопку, которая соответствует твоим планам.',
											{ from: request.from, to: request.to, days: request.days }
										)
									),
									button(
										'Да, я иду в этот отпуск',
										ActionsEnum.APPROVE_VACATION_EMPLOYEE,
										JSON.stringify(request.id)
									),
									button(
										'Нет, я не иду в этот отпуск',
										ActionsEnum.DELETE_VACATION_ELEVEN_DAYS,
										JSON.stringify(request.id)
									),
									divider(),
								],
							});
							request.approve = false;
							await this.vacationRequestService.save(request);
						} else if (daysToRequest == 10 && request.approve == false) {
							await this.client.chat.postMessage({
								text: 'Запрос на отпуск сотрудником',
								channel: process.env.HR_CHANNEL,
								blocks: [
									mkdown('Всем привет!'),
									mkdown(
										this.messages(
											'<@{emp}> необходимо подтвердить свои планы на отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
												` с {from , date, long}
												\nЕсли сотрудник этого не сделает в течение дня, то отпуск будет считаться утвержденным.`,
											{
												emp: request.employee.slackId,
												days: request.days,
												from: request.from,
											}
										)
									),
									divider(),
								],
							});
						}
					} catch (error) {
						captureException(error, {
							module: 'vacation',
							job: 'check employee decision',
						});
					}
				});
			}
		}
	}

	@Cron(CronExpression.EVERY_DAY_AT_NOON)
	@SentryOverwatch({ module: 'vacation', job: 'mailing sign document' })
	async noticeSignOrder() {
		const requests = await this.vacationRequestService.findHEADApprovedRequests();
		const today = new Date(this.calendar.today().setHours(0, 0, 0, 0));
		const { decision } = await this.calendar.prodCalendarCalculator(today, 1, 'vac');
		if (decision) {
			if (requests) {
				requests.map(async (request) => {
					try {
						const daysToRequest = await this.calendar.getWorkDays(request.from);
						if (daysToRequest === 4) {
							await this.client.chat.postMessage({
								text: 'Запрос на отпуск',
								channel: request.employee.slackId,
								blocks: [
									mkdown(
										this.messages('Привет, <@{employee}>!', {
											employee: request.employee.slackId,
										})
									),
									mkdown(
										'Пора подписать документы на отпуск. Обратись в отдел кадров или к HR-ам за инструкцией.'
									),
								],
							});

							this.emailTemplatesService.sendEmailSignDocumentsForVacation(request);
						}
					} catch (error) {
						captureException(error, {
							module: 'vacation',
							job: 'mailing sign document',
						});
					}
				});
			}
		}
	}
}
