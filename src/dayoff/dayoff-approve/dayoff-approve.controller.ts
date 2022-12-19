import { Controller } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebClient } from '@slack/web-api';
import { mkdown } from '../../templates/mkdown';
import { button } from '../../templates/button';
import { Context } from '../../slack-bot/context/context';
import { Action } from '../../slack-bot/decorator/action.decorator';
import { EntityNotFoundException } from '../../database/util/entity-not-found.exception';
import { divider } from '../../templates/divider';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { DayoffRequestConfirmService } from '../../database/service/dayoff-request-confirm.service';
import { DayoffRequestConfirmStatus } from '../../database/util/dayoff-request-confirm-status.enum';
import { DayoffRequestStatus } from '../../database/util/dayoff-request-status.enum';
import { SentryOverwatch } from '../../main/sentry.overwatch';
import { EmailTpl } from '../../main/email-tpl.decorator';
import { EmailSender } from '../../main/email-message-option.interface';
import { Messages } from '../../main/messages.service';
import { HelperService } from '../../main/helper.service';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import {
	getKafkaEmployeeDayoffApprovedData,
	getKafkaEmployeeDayoffCancelData,
	getKafkaEmployeeDayoffCreateOrFinishData,
} from '../../kafka/utils/tranformers';
import { captureException } from '../../_services/sentry';
import { messageFormat } from '../../utils';

const APPROVE_CONFIRM_ACTION = 'approve_confirm_dayoff_request';
const REJECT_CONFIRM_ACTION = 'reject_confirm_dayoff_request';
const APPROVE_REQUEST_ACTION = 'approve_dayoff_request';
const REJECT_REQUEST_ACTION = 'reject_dayoff_request';

@Controller('dayoff-approve')
export class DayoffApproveController {
	@EmailTpl('dayoffApproveForEmployee') dayoffApproveForEmployee: EmailSender;
	@EmailTpl('dayoffApproveForFinDep') dayoffApproveForFinDep: EmailSender;
	@EmailTpl('dayoffApproveWithoutOk') dayoffApproveWithoutOk: EmailSender;

	constructor(
		private client: WebClient,
		private dayoffRequestService: DayoffRequestService,
		private dayoffRequestConfirmService: DayoffRequestConfirmService,
		private messages: Messages,
		private helper: HelperService,
		private readonly kafkaService: KafkaService
	) {}

	@Cron(CronExpression.EVERY_MINUTE)
	async mailingUpdatePMandHead() {
		try {
			await this.mailingUpdatePm();
		} catch (error) {
			captureException(error, {
				module: 'dayOff',
				job: 'mailing update PMs and Heads: PMs part',
			});
		}
		try {
			await this.mailingUpdateHead();
		} catch (error) {
			captureException(error, {
				module: 'dayOff',
				job: 'mailing update PMs and Heads: Heads part',
			});
		}
	}

	@Cron(CronExpression.EVERY_MINUTE)
	@SentryOverwatch({ module: 'dayoff', job: 'mailing PMs' })
	async mailingPM() {
		const requests = await this.dayoffRequestService.findNewRequests();

		if (requests && requests.length) {
			for (const request of requests) {
				try {
					if (request.confirms.length == 0) {
						request.status = DayoffRequestStatus.APPROVED_ALL_PM;
						await this.dayoffRequestService.save(request);
					} else {
						for (const confirm of request.confirms) {
							const response = await this.client.chat.postMessage({
								text: 'Запрос на отгул',
								channel: confirm.manager.slackId,
								blocks: [
									mkdown(
										this.messages(
											// eslint-disable-next-line max-len
											'<@{emp}> хочет взять отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
											{
												emp: request.employee.slackId,
												days: request.days,
												from: request.from,
												to: request.to,
											}
										)
									),
									mkdown(`Причина отгула - ${request.reason}.`),
									mkdown(
										`Планируется отрабатывать - ${this.helper.boolToRus(
											Boolean(request.workingOff)
										)}.`
									),
									mkdown(
										'Если вы ранее еще не обсуждали с сотрудником его отгул, сделайте это сейчас.'
									),
									button('Подтвердить', APPROVE_CONFIRM_ACTION, JSON.stringify(confirm.id)),
									button('Отклонить', REJECT_CONFIRM_ACTION, JSON.stringify(confirm.id)),
									divider(),
								],
							});
							confirm.status = DayoffRequestConfirmStatus.WAIT;
							confirm.channelId = response.channel;
							confirm.messageTs = response.ts;
						}

						request.status = DayoffRequestStatus.WAIT_PM;
						await this.dayoffRequestService.save(request);
					}
				} catch (error) {
					captureException(error, { module: 'dayoff', job: 'mailing PMs' });
				}
			}
		}
	}

	async mailingUpdatePm() {
		const dayOffRejectedRequests = await this.dayoffRequestService.findRejectedRequests();

		if (dayOffRejectedRequests && dayOffRejectedRequests.length) {
			for (const request of dayOffRejectedRequests) {
				try {
					for (const confirm of request.confirms) {
						if (confirm.status !== DayoffRequestConfirmStatus.APPROVED) {
							await this.client.chat.update({
								channel: confirm.channelId,
								ts: confirm.messageTs,
								blocks: [
									mkdown(
										this.messages(
											'<@{name}> хочет взять отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from} по {to}',
											{
												name: request.employee.slackId,
												days: request.days,
												from: this.helper.convertDate(request.from),
												to: this.helper.convertDate(request.to),
											}
										)
									),
									mkdown(`Причина отгула - ${request.reason}.`),
									mkdown(
										`Планируется отрабатывать - ${this.helper.boolToRus(
											Boolean(request.workingOff)
										)}.`
									),
									mkdown(
										'Если вы ранее еще не обсуждали с сотрудником его отгул, сделайте это сейчас.'
									),
									divider(),
								],
							});
						}
					}

					await this.dayoffRequestService.save(request);
				} catch (error) {
					captureException(error, { module: 'dayoff', job: 'mailing PMs' });
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
			await ack({});

			const confirm = await this.dayoffRequestConfirmService.getById(Number(actionData), [
				'dayoffRequest',
				'dayoffRequest.confirms',
				'dayoffRequest.confirms.manager',
				'dayoffRequest.employee',
				'dayoffRequest.employee.head',
			]);

			if (
				confirm.status == DayoffRequestConfirmStatus.WAIT &&
				confirm.dayoffRequest.status == DayoffRequestStatus.WAIT_PM
			) {
				confirm.status = DayoffRequestConfirmStatus.APPROVED;
				const needConfirmNum = confirm.dayoffRequest.confirms.filter(
					(confirm) => confirm.status == DayoffRequestConfirmStatus.WAIT
				).length;

				if (needConfirmNum == 1) {
					confirm.dayoffRequest.status = DayoffRequestStatus.APPROVED_ALL_PM;
					await this.dayoffRequestService.save(confirm.dayoffRequest);
				}

				await this.dayoffRequestConfirmService.save(confirm);
				const updatedRequest = await this.dayoffRequestService.getById(confirm.dayoffRequest.id, [
					'confirms',
					'employee',
					'confirms.manager',
					'employee.head',
				]);
				await this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_DAYOFF_APPROVED,
					getKafkaEmployeeDayoffApprovedData(updatedRequest, updatedRequest.employee)
				);
				const employeeSlackId = confirm.dayoffRequest.employee.slackId;
				const requestFrom = confirm.dayoffRequest.from;
				const requestTo = confirm.dayoffRequest.to;
				const requestDays = confirm.dayoffRequest.days;
				const requestReason = confirm.dayoffRequest.reason;
				const requestWorkingOff = confirm.dayoffRequest.workingOff;
				await this.client.chat.update({
					channel: channelId,
					ts: messageId,
					text: 'Запрос на отгул',
					blocks: [
						mkdown(
							this.messages(
								'Отгул <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
								{
									emp: employeeSlackId,
									days: requestDays,
									from: requestFrom,
									to: requestTo,
								}
							)
						),
						mkdown(`Причина отгула - ${requestReason}.`),
						mkdown(
							`Планируется отрабатывать - ${this.helper.boolToRus(Boolean(requestWorkingOff))}`
						),
						mkdown(`:white_check_mark: _Подтверждено ${this.helper.convertDate(new Date())}_`),
						divider(),
					],
				});
				await this.client.chat.postMessage({
					text: 'Запрос на отгул',
					channel: employeeSlackId,
					blocks: [
						mkdown(
							this.messages(
								'Твой отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long} согласован ПМом <@{pm}>',
								{
									days: requestDays,
									from: requestFrom,
									to: requestTo,
									pm: user.slackId,
								}
							)
						),
						mkdown(`:white_check_mark: _Подтверждено ${this.helper.convertDate(new Date())}_`),
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
			const confirm = await this.dayoffRequestConfirmService.getById(Number(actionData), [
				'manager',
				'dayoffRequest',
				'dayoffRequest.confirms',
				'dayoffRequest.employee',
				'dayoffRequest.confirms.manager',
			]);

			if (
				confirm.status == DayoffRequestConfirmStatus.WAIT &&
				confirm.dayoffRequest.status == DayoffRequestStatus.WAIT_PM
			) {
				confirm.status = DayoffRequestConfirmStatus.REJECTED;
				confirm.dayoffRequest.status = DayoffRequestStatus.REJECTED_PM;
				await this.dayoffRequestService.save(confirm.dayoffRequest);
				await this.dayoffRequestConfirmService.save(confirm);

				await ack({});
				const updatedRequest = await this.dayoffRequestService.getById(confirm.dayoffRequest.id, [
					'confirms',
					'employee',
					'confirms.manager',
					'employee.head',
				]);
				await this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_DAYOFF_CANCEL,
					getKafkaEmployeeDayoffCancelData(updatedRequest, user)
				);
				const employeeSlackId = confirm.dayoffRequest.employee.slackId;
				const requestFrom = confirm.dayoffRequest.from;
				const requestTo = confirm.dayoffRequest.to;
				const requestDays = confirm.dayoffRequest.days;
				const requestReason = confirm.dayoffRequest.reason;
				const requestWorkingOff = confirm.dayoffRequest.workingOff;

				await this.client.chat.update({
					channel: channelId,
					ts: messageId,
					text: 'Запрос на отгул',
					blocks: [
						mkdown(
							this.messages(
								'Отгул <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
								{
									emp: employeeSlackId,
									days: requestDays,
									from: requestFrom,
									to: requestTo,
								}
							)
						),
						mkdown(`Причина отгула - ${requestReason}.`),
						mkdown(
							`Планируется отрабатывать - ${this.helper.boolToRus(Boolean(requestWorkingOff))}`
						),
						mkdown(`:x: _Отклонено ${this.helper.convertDate(new Date())}_`),
						divider(),
					],
				});
				await this.client.chat.postMessage({
					text: 'Запрос на отгул',
					channel: employeeSlackId,
					blocks: [
						mkdown(
							this.messages(
								'Твой отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long} отклонен ПМом <@{pm}>',
								{
									days: requestDays,
									from: requestFrom,
									to: requestTo,
									pm: user.slackId,
								}
							)
						),
						mkdown('Свяжись с ним/ней для получения дополнительной информации.'),
						mkdown(`:x: _Отклонено ${this.helper.convertDate(new Date())}_`),
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
	@SentryOverwatch({ module: 'dayoff', job: 'mailing Head' })
	async mailingHead() {
		const requests = await this.dayoffRequestService.findPMApprovedRequests();

		if (requests && requests.length) {
			for (const request of requests) {
				try {
					const blocks = [];

					if (request.confirms.length) {
						const pmSlackTags = request.confirms
							.filter((confirm) => confirm.status == DayoffRequestConfirmStatus.APPROVED)
							.map((confirm) => `<@${confirm.manager.slackId}>`)
							.join(', ');
						if (pmSlackTags.length) blocks.push(mkdown(`Согласовано и одобрено: ${pmSlackTags}`));
						const autoApprove = request.confirms.filter(
							(confirm) => confirm.status == DayoffRequestConfirmStatus.AUTO_APPROVE
						);
						if (autoApprove.length) {
							const autoPms = autoApprove
								.map((confirm) => `<@${confirm.manager.slackId}>`)
								.join(', ');

							blocks.push(
								mkdown(
									`Отгул сотрудника согласован системой, поскольку ПМ ${autoPms} не ${
										autoApprove.length > 1 ? 'ответили' : 'ответил(а)'
									} на запрос сотрудника в течение 5 дней.`
								)
							);
						}
					} else {
						blocks.push(mkdown('Сотрудник не запрашивал одобрения ПМов, так как у него их нет.'));
					}
					const employee = await this.helper.getLprRecursively(request.employee.head);

					const response = await this.client.chat.postMessage({
						text: 'Запрос на отгул',
						channel: employee.slackId,
						blocks: [
							mkdown(
								this.messages(
									'<@{emp}> хочет взять отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
									{
										emp: request.employee.slackId,
										days: request.days,
										from: request.from,
										to: request.to,
									}
								)
							),
							mkdown(`Причина отгула - ${request.reason}.`),
							mkdown(
								`Планируется отрабатывать - ${this.helper.boolToRus(Boolean(request.workingOff))}.`
							),
							...blocks,
							mkdown(
								'Если вы ранее еще не обсуждали с сотрудником его отгул, сделайте это сейчас.'
							),
							button('Подтвердить', APPROVE_REQUEST_ACTION, JSON.stringify(request.id)),
							button('Отклонить', REJECT_REQUEST_ACTION, JSON.stringify(request.id)),
							divider(),
						],
					});
					request.messageTs = response.ts;
					request.channelId = response.channel;
					request.status = DayoffRequestStatus.WAIT_HEAD;
					await this.dayoffRequestService.save(request);
				} catch (error) {
					captureException(error, { module: 'dayoff', job: 'mailing Head' });
				}
			}
		}
	}

	async mailingUpdateHead() {
		const dayOffRejectedRequests = await this.dayoffRequestService.findRejectedRequests();

		if (dayOffRejectedRequests && dayOffRejectedRequests.length) {
			for (const request of dayOffRejectedRequests) {
				try {
					await this.client.chat.update({
						text: 'Запрос на отгул',
						channel: request.channelId,
						ts: request.messageTs,
						blocks: [
							mkdown(
								messageFormat(
									'<@{employee}> хочет взять отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from} по {to}',
									{
										days: request.days,
										employee: request.employee.slackId,
										from: this.helper.convertDate(request.from),
										to: this.helper.convertDate(request.to),
									}
								)
							),
							mkdown(`Причина отгула - ${request.reason}.`),
							mkdown(
								`Планируется отрабатывать - ${this.helper.boolToRus(Boolean(request.workingOff))}.`
							),
							divider(),
						],
					});

					request.isRejectDayOff = false;
					await this.dayoffRequestService.save(request);
				} catch (error) {
					captureException(error, {
						module: 'dayoff',
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
			const request = await this.dayoffRequestService.getById(Number(actionData), [
				'employee',
				'confirms',
				'confirms.manager',
				'employee.head',
			]);

			if (request.status == DayoffRequestStatus.WAIT_HEAD) {
				request.status = DayoffRequestStatus.APPROVED_HEAD;

				await ack({});
				const blocks = [];

				if (request.confirms.length) {
					const pmSlackTags = request.confirms
						.filter((confirm) => confirm.status == DayoffRequestConfirmStatus.APPROVED)
						.map((confirm) => `<@${confirm.manager.slackId}>`)
						.join(', ');

					if (pmSlackTags) blocks.push(mkdown(`Согласовано и одобрено: ${pmSlackTags}`));
					const autoApprove = request.confirms.filter(
						(confirm) => confirm.status == DayoffRequestConfirmStatus.AUTO_APPROVE
					);

					if (autoApprove.length) {
						const autoPms = autoApprove
							.map((confirm) => `<@${confirm.manager.slackId}>`)
							.join(', ');
						blocks.push(
							mkdown(
								`Отгул сотрудника согласован системой, поскольку: ${autoPms} не ${
									autoApprove.length > 1 ? 'ответили' : 'ответил(а)'
								} на запрос.`
							)
						);
					}
				} else {
					blocks.push(mkdown('Сотрудник не запрашивал одобрения ПМов, так как у него их нет.'));
				}

				await this.client.chat.update({
					channel: channelId,
					ts: messageId,
					text: 'Запрос на отгул',
					blocks: [
						mkdown(
							this.messages(
								'Отгул <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
								{
									emp: request.employee.slackId,
									days: request.days,
									from: request.from,
									to: request.to,
								}
							)
						),
						mkdown(`Причина отгула - ${request.reason}.`),
						mkdown(
							`Планируется отрабатывать - ${this.helper.boolToRus(Boolean(request.workingOff))}`
						),
						...blocks,
						mkdown(`:white_check_mark: _Подтверждено ${this.helper.convertDate(new Date())}_`),
						divider(),
					],
				});

				await this.client.chat.postMessage({
					text: 'Запрос на отгул',
					channel: request.employee.slackId,
					blocks: [
						mkdown(
							this.messages(
								'Твой отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long}' +
									' по {to, date, long} согласован руководителем <@{head}>.',
								{
									days: request.days,
									from: request.from,
									to: request.to,
									head: user.slackId,
								}
							)
						),
						mkdown(`:white_check_mark: _Подтверждено ${this.helper.convertDate(new Date())}_`),
						divider(),
					],
				});

				const firstEmailList = [];
				const secondEmailList = [];
				const thirdEmailList = [];

				let pmEmailList;

				if (request.confirms.length) {
					pmEmailList = request.confirms.map((pm) => pm.manager.email);
					secondEmailList.push(...pmEmailList);
				}

				if (request.employee.head.isLPR === false) {
					const employee = await this.helper.getLprRecursively(request.employee.head);

					secondEmailList.push(employee.slackId);
				}

				secondEmailList.push(
					request.employee.email,
					process.env.MAILER_FIN_DEPARTMENT_EMAIL,
					process.env.MAILER_PD_EMAIL,
					process.env.MAILER_HR
				);

				if (request.workingOff) {
					this.dayoffApproveWithoutOk(
						thirdEmailList,
						{
							request,
							from: this.messages('{from , date, long}', {
								from: request.from,
							}),
							to: this.messages('{to , date, long}', { to: request.to }),
							days: this.messages(
								'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
								{ days: request.days }
							),
							shortDays: this.messages(
								'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
								{ days: request.days }
							),
						},
						{
							// func for checking workingOff after the filter list of DEP-emails
							// Calling in the nodemailer.service.ts
							isWorkingOff(data, to: Array<string>) {
								if (data.request.workingOff === 'нет') {
									const bar = [
										'adonis.christiansen41@ethereal.email',
										'abdull5555555555555@gmail.com',
									];
									to = to.filter((item) => {
										if (!bar.includes(item)) {
											return item;
										}
									});
									return to;
								}
							},
						}
					);
				} else {
					this.dayoffApproveForFinDep(
						firstEmailList,
						{
							request,
							from: this.messages('{from , date, long}', {
								from: request.from,
							}),
							to: this.messages('{to , date, long}', { to: request.to }),
							days: this.messages(
								'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
								{ days: request.days }
							),
							shortDays: this.messages(
								'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
								{ days: request.days }
							),
						},
						{
							// func for checking workingOff after the filter list of DEP-emails
							// Calling in the nodemailer.service.ts
							isWorkingOff(data, to: Array<string>) {
								if (data.request.workingOff === 'нет') {
									const depEmails = [
										process.env.MAILER_FIN_DEPARTMENT_EMAIL,
										process.env.MAILER_PD_EMAIL,
									];
									to = to.filter((item) => {
										if (!depEmails.includes(item)) {
											return item;
										}
									});
									return to;
								}
							},
						}
					);
				}

				this.dayoffApproveForEmployee(secondEmailList, {
					request,
					from: this.messages('{from , date, long}', { from: request.from }),
					to: this.messages('{to , date, long}', { to: request.to }),
					days: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
						days: request.days,
					}),
					shortDays: this.messages(
						'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
						{ days: request.days }
					),
				});
				await this.dayoffRequestService.save(request);
				await this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_DAYOFF_FINISH,
					getKafkaEmployeeDayoffCreateOrFinishData(request, request.employee)
				);
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
			const request = await this.dayoffRequestService.getById(Number(actionData), [
				'employee',
				'employee.head',
				'confirms',
				'confirms.manager',
			]);

			if (request.status == DayoffRequestStatus.WAIT_HEAD) {
				request.status = DayoffRequestStatus.REJECTED_HEAD;
				await ack({});
				const employeeSlackId = request.employee.slackId;
				const requestReason = request.reason;
				const requestWorkingOff = request.workingOff;

				if (request.confirms.length != 0) {
					const pmSlackTags = request.confirms
						.map((confirm) => `<@${confirm.manager.slackId}>`)
						.join(', ');
					await this.client.chat.update({
						channel: channelId,
						ts: messageId,
						text: 'Запрос на отгул',
						blocks: [
							mkdown(
								this.messages(
									'Отгул <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
									{
										emp: request.employee.slackId,
										days: request.days,
										from: request.from,
										to: request.to,
									}
								)
							),
							mkdown(`Причина отгула - ${requestReason}.`),
							mkdown(
								`Планируется отрабатывать - ${this.helper.boolToRus(Boolean(requestWorkingOff))}`
							),
							mkdown(`Согласовано и одобрено: ${pmSlackTags}`),
							mkdown(`:x: _Отклонено ${this.helper.convertDate(new Date())}_`),
							divider(),
						],
					});
				} else {
					await this.client.chat.update({
						ts: messageId,
						channel: channelId,
						text: 'Запрос на отгул',
						blocks: [
							mkdown(
								this.messages(
									'Отгул <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
									{
										emp: request.employee.slackId,
										days: request.days,
										from: request.from,
										to: request.to,
									}
								)
							),
							mkdown(`Причина отгула - ${requestReason}.`),
							mkdown(
								`Планируется отрабатывать - ${this.helper.boolToRus(Boolean(requestWorkingOff))}`
							),
							mkdown(`:x: _Отклонено ${this.helper.convertDate(new Date())}_`),
							divider(),
						],
					});

					await this.dayoffRequestService.save(request);
				}
				if (request.confirms.length != 0) {
					request.confirms.map(async (confirm) => {
						await this.client.chat.postMessage({
							channel: confirm.manager.slackId,
							text: 'Запрос на отгул',
							blocks: [
								mkdown(
									this.messages(
										'Отгул <@{emp}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
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
								mkdown(`:x: _Отклонено ${this.helper.convertDate(new Date())}_`),
								divider(),
							],
						});
					});
				}
				await this.client.chat.postMessage({
					text: 'Запрос на отгул',
					channel: employeeSlackId,
					blocks: [
						mkdown(
							this.messages(
								'Твой отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
									' c {from, date, long} по {to, date, long} отклонен руководителем <@{pm}>',
								{
									days: request.days,
									from: request.from,
									to: request.to,
									pm: user.slackId,
								}
							)
						),
						mkdown('Свяжись с ним/ней для получения дополнительной информации.'),
						mkdown(`:x: _Отклонено ${this.helper.convertDate(new Date())}_`),
						divider(),
					],
				});
				await this.dayoffRequestService.save(request);
				await this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_DAYOFF_CANCEL,
					getKafkaEmployeeDayoffCancelData(request, user)
				);
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

	@Cron('0 12 * * *')
	@SentryOverwatch({ module: 'dayoff', job: 'check PM response' })
	async checkPmResponse() {
		const requests = await this.dayoffRequestService.findAwaitingRequests();
		const today = new Date(new Date().setHours(0, 0, 0, 0));
		const workDay = await this.helper.prodCalendarCalculator(today, 1, 'vac');
		if (workDay) {
			if (requests) {
				requests.map(async (request) => {
					try {
						if (request.status === DayoffRequestStatus.WAIT_PM) {
							request.confirms.map(async (pmConfirm) => {
								if (pmConfirm.status == DayoffRequestConfirmStatus.WAIT) {
									if (pmConfirm.counter < 4) {
										await this.client.chat.postMessage({
											text: 'Запрос на отгул',
											channel: pmConfirm.manager.slackId,
											thread_ts: pmConfirm.messageTs,
											blocks: [
												mkdown(
													this.messages(
														'Привет <@{pm}>! <@{employee}> ждет твоего решения по отгулу. Нажми на одну из кнопок выше :point_up_2:',
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
										await this.dayoffRequestConfirmService.save(pmConfirm);
									} else if (pmConfirm.counter == 4) {
										const response = await this.client.chat.postMessage({
											text: 'Запрос на отгул',
											channel: pmConfirm.manager.slackId,
											thread_ts: pmConfirm.messageTs,
											blocks: [
												mkdown(
													this.messages(
														'В связи с твоим молчанием отгул <@{employee}> одобрен автоматически и отправлен на согласование руководителю сотрудника.',
														{ employee: request.employee.slackId }
													)
												),
												divider(),
											],
										});
										await this.client.chat.update({
											text: 'Запрос на отгул',
											channel: response.channel,
											ts: pmConfirm.messageTs,
											blocks: [
												mkdown(
													this.messages(
														'Отгул <@{employee}> на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
															' c {from, date, long} по {to, date, long}',
														{
															employee: request.employee.slackId,
															days: request.days,
															from: request.from,
															to: request.to,
														}
													)
												),
												mkdown(
													`:white_check_mark: _Подтверждено ${this.helper.convertDate(new Date())}_`
												),
												divider(),
											],
										});
										await this.client.chat.postMessage({
											text: 'Запрос на отгул',
											channel: request.employee.slackId,
											blocks: [
												mkdown(
													this.messages(
														'В связи с молчанием <@{pm}> отгул одобрен автоматически.',
														{ pm: pmConfirm.manager.slackId }
													)
												),
												mkdown(
													this.messages(
														'Отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
														{
															days: request.days,
															from: request.from,
															to: request.to,
														}
													)
												),
												mkdown(
													`:white_check_mark: _Подтверждено ${this.helper.convertDate(new Date())}_`
												),
												divider(),
											],
										});
										if (
											pmConfirm.status == DayoffRequestConfirmStatus.WAIT &&
											request.status == DayoffRequestStatus.WAIT_PM
										) {
											pmConfirm.status = DayoffRequestConfirmStatus.AUTO_APPROVE;
											const needConfirmNum = request.confirms.filter(
												(confirm) => confirm.status == DayoffRequestConfirmStatus.WAIT
											).length;
											if (needConfirmNum == 0) {
												request.status = DayoffRequestStatus.APPROVED_ALL_PM;
												await this.dayoffRequestService.save(request);
											}
											await this.dayoffRequestConfirmService.save(pmConfirm);
										}
									}
								}
							});
						} else {
							if (request.counter < 4) {
								await this.client.chat.postMessage({
									text: 'Запрос на отгул',
									thread_ts: request.messageTs,
									channel: request.employee.head.slackId,
									blocks: [
										mkdown(
											this.messages(
												'Привет <@{head}>! <@{employee}> ждет твоего решения по отгулу. Нажми на одну из кнопок выше :point_up_2:',
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
								await this.dayoffRequestService.save(request);
							} else if (request.counter == 4) {
								const response = await this.client.chat.postMessage({
									text: 'Запрос на отгул',
									channel: request.employee.head.slackId,
									thread_ts: request.messageTs,
									blocks: [
										mkdown(
											this.messages(
												'В связи с твоим молчанием отгул <@{employee}> отправлен на согласование твоему руководителю.',
												{ employee: request.employee.slackId }
											)
										),
										divider(),
									],
								});
								await this.client.chat.update({
									text: 'Запрос на отгул',
									channel: response.channel,
									ts: request.messageTs,
									blocks: [
										mkdown(
											this.messages(
												'Отгул <@{employee}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
												{
													employee: request.employee.slackId,
													days: request.days,
													from: request.from,
													to: request.to,
												}
											)
										),
										mkdown(
											`:white_check_mark: _Подтверждено ${this.helper.convertDate(new Date())}_`
										),
										divider(),
									],
								});
								await this.client.chat.postMessage({
									text: 'Запрос на отгул',
									channel: request.employee.slackId,
									blocks: [
										mkdown(
											this.messages(
												'В связи с молчанием <@{head}> отгул отправлен на одобрение <@{headOfHead}>.',
												{
													head: request.employee.head.slackId,
													headOfHead: request.employee.head.head.slackId,
												}
											)
										),
										mkdown(
											this.messages(
												'Отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from}',
												{
													days: request.days,
													from: this.helper.convertDate(request.from),
												}
											)
										),
										divider(),
									],
								});
								await this.client.chat.postMessage({
									text: 'Запрос на отгул',
									channel: request.employee.head.head.slackId,
									blocks: [
										mkdown(
											this.messages('Привет, <@{headOfHead}>!', {
												headOfHead: request.employee.head.head.slackId,
											})
										),
										mkdown(
											this.messages(
												'<@{head}> уже 5 дней не отвечает на запрос на отгул <@{employee}>. Пожалуйста, согласуй отгул.',
												{
													head: request.employee.head.slackId,
													employee: request.employee.slackId,
												}
											)
										),
										mkdown(
											this.messages(
												'Отгул <@{employee}> на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
												{
													employee: request.employee.slackId,
													days: request.days,
													from: request.from,
													to: request.to,
												}
											)
										),
										mkdown(`Причина отгула - ${request.reason}.`),
										mkdown(
											`Планируется отрабатывать - ${this.helper.boolToRus(
												Boolean(request.workingOff)
											)}`
										),
										button('Подтвердить', APPROVE_REQUEST_ACTION, JSON.stringify(request.id)),
										button('Отклонить', REJECT_REQUEST_ACTION, JSON.stringify(request.id)),
										divider(),
									],
								});
								request.counter++;
								await this.dayoffRequestService.save(request);
							}
						}
					} catch (error) {
						captureException(error, {
							module: 'dayoff',
							job: 'check PM response',
						});
					}
				});
			}
		}
	}
}
