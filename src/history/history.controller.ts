import { Controller } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Context } from '../slack-bot/context/context';
import { ActionsEnum } from '../configs/actions';
import { Action } from '../slack-bot/decorator/action.decorator';
import { HistoryService } from './history.service';
import { DayoffRequestService } from '../database/service/dayoff-request.service';
import { VacationRequestService } from '../database/service/vacation-request.service';
import { DayoffRequestStatus } from '../database/util/dayoff-request-status.enum';
import { WebClient } from '@slack/web-api';
import { mkdown } from '../templates/mkdown';
import { divider } from '../templates/divider';
import { Messages } from '../main/messages.service';
import { button } from '../templates/button';
import { EmailTpl } from '../main/email-tpl.decorator';
import { EmailSender } from '../main/email-message-option.interface';
import { EmployeeService } from '../database/service/employee.service';
import { HelperService } from '../main/helper.service';
import { SellRequestService } from '../database/service/sell.service';
import { DaysMessagesService } from '../database/service/days-messages.service';
import { DaysMessages } from '../database/entity/messages.entity';
import { SellRequestStatus } from '../database/util/sell-request-status.enum';
import { ProdCalendarService } from '../database/service/production-calendar.service';
import { VacationRequestStatus } from '../database/util/vacation-request-status.enum';
import { SentryOverwatch } from '../main/sentry.overwatch';
import { captureException } from '../_services/sentry';
import {
	DAYOFF_STATUS_PREFIX,
	ProfileUpdate,
	STATUS_NO_EXPIRATION,
	VACATION_STATUS_PREFIX,
} from './history.interface';
import { Employee } from '../database/entity/employee.entity';
import { isSameDay, subDays } from 'date-fns';
import { CalendarService } from '../calendar/calendar.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

@Controller('history')
export class HistoryController {
	@EmailTpl('prodCalendarMsgToHR') prodCalendarMsgToHR: EmailSender;

	constructor(
		private client: WebClient,
		private historyService: HistoryService,
		private dayoffRequestService: DayoffRequestService,
		private vacationRequestService: VacationRequestService,
		private employeeService: EmployeeService,
		private messages: Messages,
		private helper: HelperService,
		private sellService: SellRequestService,
		private daysMessages: DaysMessagesService,
		private calendar: ProdCalendarService,
		private calendarService: CalendarService,
		private emailTemplatesService: EmailTemplatesService
	) {}

	private async setUserProfile(payload: ProfileUpdate) {
		return await this.client.users.profile.set({
			token: process.env.SLACK_USER_TOKEN,
			user: payload.slackId,
			profile: JSON.stringify({
				status_text: payload.text,
				status_emoji: payload.emoji,
				status_expiration: payload.expiration,
			}),
		});
	}

	private async getUserProfile(email: string) {
		const slackUser = await this.client.users.lookupByEmail({
			email: email,
			token: process.env.SLACK_USER_TOKEN,
		});
		return slackUser.user.profile;
	}

	@Action(ActionsEnum.HISTORY)
	async history({ ack, user, views }: Context) {
		await ack();
		const fields = await this.historyService.requests(user);

		await views.publish({
			user_id: user.slackId,
			view: {
				type: 'home',
				blocks: [...fields],
			},
		});
	}

	@Action(ActionsEnum.CHANGE_STATUS_VAC)
	async changeStatusVac({ ack, messageId, channelId, user, actionData }: Context) {
		await ack();
		const request = await this.vacationRequestService.getById(Number(actionData));
		await this.client.chat.delete({
			channel: channelId,
			ts: messageId,
		});
		const dateTo = new Date(request.to)
			.toLocaleDateString('ru-ru', {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
			})
			.split('.')
			.join(' ');

		const dateFrom = new Date(request.from)
			.toLocaleDateString('ru-ru', {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
			})
			.split('.')
			.join(' ');

		const expiration = new Date(request.to).getTime() / 1000;
		const slackProfile = await this.getUserProfile(user.email);
		await this.employeeService.updateSlackStatus(user.id, {
			slack_status_emoji: slackProfile.status_emoji,
			slack_status_expiration: slackProfile.status_expiration,
			slack_status_text: slackProfile.status_text,
		});
		await this.setUserProfile({
			slackId: user.slackId,
			text: `${VACATION_STATUS_PREFIX} ${dateFrom} - ${dateTo}`,
			emoji: ':palm_tree:',
			expiration: expiration,
		});
	}

	@Action(ActionsEnum.CHANGE_STATUS_DAYOFF)
	async changeStatusDayoff({ ack, messageId, channelId, user, actionData }: Context) {
		await ack();
		const request = await this.dayoffRequestService.getById(Number(actionData));
		await this.client.chat.delete({
			channel: channelId,
			ts: messageId,
		});

		const dateTo = new Date(request.to)
			.toLocaleDateString('ru-ru', {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
			})
			.split('.')
			.join(' ');
		const dateFrom = new Date(request.from)
			.toLocaleDateString('ru-ru', {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
			})
			.split('.')
			.join(' ');
		const expiration = new Date(request.to).getTime() / 1000;
		const slackProfile = await this.getUserProfile(user.email);
		await this.employeeService.updateSlackStatus(user.id, {
			slack_status_emoji: slackProfile.status_emoji,
			slack_status_expiration: slackProfile.status_expiration,
			slack_status_text: slackProfile.status_text,
		});
		await this.setUserProfile({
			slackId: user.slackId,
			text: `${DAYOFF_STATUS_PREFIX} ${dateFrom} - ${dateTo}`,
			emoji: ':palm_tree:',
			expiration: expiration,
		});
	}

	@Cron('0 12 * * 1')
	@SentryOverwatch({ module: 'history', job: 'vacation days check' })
	async vacationDaysCheck() {
		const employees = await this.employeeService.getAllWithDays();
		employees.map(async (employee) => {
			if (!employee.SPStatus) {
				try {
					const message = await this.client.chat.postMessage({
						channel: employee.slackId,
						text: 'Большое количество отпускных дней',
						blocks: [
							mkdown(
								this.messages(
									'Привет, <@{employee}>! У тебя накопилось большое количество отпускных дней - {days}.' +
										'\nТы можешь пойти в отпуск или продать эти отпускные дни.',
									{
										employee: employee.slackId,
										days: this.helper.round(employee.days),
									}
								)
							),
							button('Продать дни отпуска', ActionsEnum.GET_FEEDBACK_EMPLOYEE),
							button('Запланировать отпуск', ActionsEnum.VACATION_PLAN_REDIRECT),
							divider(),
						],
					});
					const daysMessage = new DaysMessages();
					daysMessage.messageTs = message.ts;
					daysMessage.employee = employee;
					if (employee.daysMessages[0]) {
						await this.client.chat.delete({
							channel: message.channel,
							ts: employee.daysMessages[0].messageTs,
						});
						await this.daysMessages.updateEntity(daysMessage);
					} else {
						await this.daysMessages.save(daysMessage);
					}
				} catch (error) {
					captureException(error, {
						module: 'history',
						job: 'vacation days check',
					});
				}
			}
		});
	}

	@Cron('0 10 1 11 *')
	@SentryOverwatch({ module: 'history', job: 'vacation length check' })
	async vacationLengthCheck() {
		const employees = await this.employeeService.getAll();
		employees.map(async (employee) => {
			try {
				let countVac = 0;
				let countSell = 0;

				const vacations = await this.vacationRequestService.findVacationRequestsForYear(employee);
				if (vacations.length) {
					vacations.map((vacation) => {
						countVac = +vacation.days;
					});
				}
				const sells = await this.sellService.findSellRequestsForYear(employee);
				if (sells.length) {
					sells.map((sell) => {
						countSell = +sell.days;
					});
				}
				if (employee.days > 14) {
					if (countSell + countVac < 14) {
						const dif = 14 - countSell - countVac;
						await this.client.chat.postMessage({
							channel: employee.slackId,
							text: 'Большое количество отпускных дней',
							blocks: [
								mkdown(
									this.messages(
										'Привет <@{employee}>! Год подходит к концу: время проверить твои дни отпуска!' +
											'\nЗа этот год ты сходил в отпуск на {countVac} {countVac, plural, one {день} few {дня} many {дней} other {}} ' +
											'и продал {countSell} {countSell, plural, one {день} few {дня} many {дней} other {}} отпуска.' +
											'\nПо трудовому кодексу компания обязяна отпускать сотрудника в отпуск минимум на 2 недели в год, поэтому, ' +
											'пожалуйста, запланируй продажу {dif} {dif, plural, one {оставшегося дня} few {оставшихся дней} many {оставшихся дней} other {}}' +
											' отпуска до конца года.',
										{
											employee: employee.slackId,
											countVac: Number(countVac),
											countSell: Number(countSell),
											dif,
										}
									)
								),
								divider(),
							],
						});
					}
				}
			} catch (error) {
				captureException(error, {
					module: 'history',
					job: 'vacation length check',
				});
			}
		});
	}

	@Cron('0 6 20,25,30 10 *')
	@SentryOverwatch({ module: 'history', job: 'sent HR email' })
	async sentHrEmail() {
		const year = new Date().getFullYear() + 1;
		const calendar = await this.calendar.findOne({ year: String(year) });
		if (calendar.active == false) {
			this.prodCalendarMsgToHR(process.env.MAILER_HR, {});
		} else {
			return;
		}
	}

	private async restoreUserSlackStatus(employee: Employee, bot_status_prefix: string) {
		const slackProfile = await this.getUserProfile(employee.email);
		const currentStatusText = slackProfile.status_text;
		const previousStatus = await this.employeeService.findOne(employee.id);
		// status changed or previous status had been set with expiration
		const shouldUpdateStatus =
			currentStatusText.startsWith(bot_status_prefix) &&
			previousStatus.slack_status_expiration === STATUS_NO_EXPIRATION;
		if (!shouldUpdateStatus) {
			// do nothing
			return;
		}
		await this.setUserProfile({
			slackId: employee.slackId,
			text: previousStatus.slack_status_text,
			emoji: previousStatus.slack_status_emoji,
			expiration: STATUS_NO_EXPIRATION,
		});
	}

	@Cron(CronExpression.EVERY_DAY_AT_2AM)
	async resetProfileStatus() {
		const yesterday = subDays(new Date(), 1);
		const vacations = await this.vacationRequestService.findVacationsEndedAt(yesterday);
		const dayoffs = await this.dayoffRequestService.findDayOffsEndedAt(yesterday);

		vacations.forEach(async (vacation) => {
			await this.restoreUserSlackStatus(vacation.employee, VACATION_STATUS_PREFIX);
		});
		dayoffs.forEach(async (dayoff) => {
			await this.restoreUserSlackStatus(dayoff.employee, DAYOFF_STATUS_PREFIX);
		});
	}

	@Cron(CronExpression.EVERY_DAY_AT_NOON)
	@SentryOverwatch({ module: 'history', job: 'add to history' })
	async endTheVacations() {
		const vacRequests = await this.vacationRequestService.findApprovedRequests();
		const today = this.calendarService.today();
		vacRequests.forEach(async (request) => {
			if (isSameDay(today, request.from)) {
				request.status = VacationRequestStatus.FINISHED;
				await this.vacationRequestService.save(request);
			}
			const workDaysUntilEndOfVacation = await this.calendarService.getWorkDays(request.from);
			if (workDaysUntilEndOfVacation === 1) {
				this.client.chat.postMessage({
					text: 'Начало отпуска',
					channel: request.employee.slackId,
					private_metadata: request,
					blocks: [
						mkdown(
							this.messages(
								'Привет, <@{employee}>! Твой отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
									' начинается с {from , date, long} Напомни об этом своим командам,' +
									' ПМу и руководителю. Чтобы проставить статус об отпуске, нажми на эту кнопку.',
								{
									days: request.days,
									from: request.from,
									to: request.to,
									employee: request.employee.slackId,
								}
							)
						),
						button('Установить статус', ActionsEnum.CHANGE_STATUS_VAC, String(request.id)),
						divider(),
					],
				});
				this.emailTemplatesService.sendEmailVacationOneDay(request.employee.email, request);
			}
		});
	}

	@Cron(CronExpression.EVERY_DAY_AT_NOON)
	@SentryOverwatch({ module: 'history', job: 'add to history' })
	async endTheSells() {
		const sellRequests = await this.sellService.findPlannedRequest();
		const today = this.calendarService.today();
		sellRequests.forEach(async (request) => {
			if (isSameDay(today, request.from)) {
				request.status = SellRequestStatus.FINISHED;
				await this.sellService.save(request);
			}
		});
	}

	@Cron(CronExpression.EVERY_DAY_AT_NOON)
	@SentryOverwatch({ module: 'history', job: 'add to history' })
	async endTheDayoffs() {
		const dayoffRequests = await this.dayoffRequestService.findApprovedRequests();
		const today = this.calendarService.today();

		dayoffRequests.forEach(async (request) => {
			if (isSameDay(today, request.from)) {
				request.status = DayoffRequestStatus.FINISHED;
				await this.dayoffRequestService.save(request);
			}
			const workDaysUntilEndOfVacation = await this.calendarService.getWorkDays(request.from);
			if (workDaysUntilEndOfVacation === 1) {
				this.client.chat.postMessage({
					text: 'Начало отгула',
					channel: request.employee.slackId,
					private_metadata: request,
					blocks: [
						mkdown(
							this.messages(
								'Привет, <@{employee}>! Cегодня твой последний рабочий день перед отгулом на ' +
									'{days} {days, plural, one {день} few {дня} many {дней} other {}}' +
									' с {from , date, long} по {to, date, long} Напомни об этом своим командам,' +
									' ПМу и руководителю, если такие есть. Чтобы проставить статус об отгуле, нажми на эту кнопку.',
								{
									days: request.days,
									from: request.from,
									to: request.to,
									employee: request.employee.slackId,
								}
							)
						),
						button('Сменить статус', ActionsEnum.CHANGE_STATUS_DAYOFF, String(request.id)),
						divider(),
					],
				});
				this.emailTemplatesService.sendEmailDayoffOneDay(request.employee.email, request);
			}
		});
	}
}
