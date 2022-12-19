import { Controller } from '@nestjs/common';
import { ActionsEnum } from '../../configs/actions';
import { Context } from '../../slack-bot/context/context';
import { Action } from '../../slack-bot/decorator/action.decorator';
import { View } from '../../slack-bot/decorator/view.decorator';
import { PlannedDayoffsService } from './planned-dayoff.service';
import { EmailTpl } from '../../main/email-tpl.decorator';
import { EmailSender } from '../../main/email-message-option.interface';
import { Messages } from '../../main/messages.service';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { HelperService } from '../../main/helper.service';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import { DayoffRequestStatus } from '../../database/util/dayoff-request-status.enum';
import { getKafkaEmployeeDayoffCancelData } from '../../kafka/utils/tranformers';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SentryOverwatch } from '../../main/sentry.overwatch';
import { captureException } from '../../_services/sentry';
import { mkdown } from '../../templates/mkdown';
import { divider } from '../../templates/divider';
import { WebClient } from '@slack/web-api';
import { isSameDay, subDays } from 'date-fns';
import { isEarlyToday16PM } from '../dayoff-plan/hard-validator.service';

@Controller('planned-dayoff')
export class PlannedDayoffController {
	@EmailTpl('dayoffCancelForEmployee') dayoffCancelForEmployee: EmailSender;
	@EmailTpl('dayoffCancelForFinDep') dayoffCancelForFinDep: EmailSender;
	@EmailTpl('dayoffCancelWithoutOK') dayoffCancelWithoutOk: EmailSender;

	constructor(
		private plannedDayoffsService: PlannedDayoffsService,
		private requestService: DayoffRequestService,
		private messages: Messages,
		private helper: HelperService,
		private client: WebClient,
		private kafkaService: KafkaService
	) {}

	@Action(ActionsEnum.PLANNED_DAYOFFS)
	async renderDayoffList({ ack, views, user }: Context) {
		await ack();
		const fields = await this.plannedDayoffsService.main(user);
		await views.publish({
			user_id: user.slackId,
			view: {
				type: 'home',
				blocks: [...fields],
			},
		});
	}

	@Action(ActionsEnum.DELETE_DAYOFF_ACTION)
	async choseDayoffToDelete({ ack, views, user, triggerId }: Context) {
		await ack();
		const view = await this.plannedDayoffsService.selectDayoff(user.id, triggerId);
		return await views.open(view);
	}

	@View(ActionsEnum.DELETE_DAYOFF_BY_ID)
	async modalConfirm({ views, ack, user, formData, say }: Context) {
		const request = await this.requestService.getById(formData.delete_dayoff, [
			'confirms',
			'confirms.manager',
			'employee',
			'employee.head',
		]);
		const calendar = await this.helper.prodCalendarCalculator(new Date(), 2, 'dayoff');
		// after 16pm and at this day
		const forbidCancelToday =
			!isEarlyToday16PM(request.from) && isSameDay(request.from, new Date());
		if (forbidCancelToday) {
			const view = this.plannedDayoffsService.cancel('today16pm');
			await ack({ response_action: 'push', view });
			return;
		}
		if (!calendar.decision) {
			const view = this.plannedDayoffsService.cancel('nonWork');
			await ack({ response_action: 'push', view });
			return;
		}
		const view = await this.plannedDayoffsService.confirmingDeleteModal({
			dayoffReqId: request.id,
			say,
			user,
		});
		await this.requestService.delete(request.id);
		request.status = DayoffRequestStatus.REJECTED_EMPLOYEE;
		await this.kafkaService.sendMessage(
			TOPICS_LIST.EMPLOYEE_DAYOFF_CANCEL,
			getKafkaEmployeeDayoffCancelData(request, user)
		);
		const emails = [];
		const slackIds = [];
		request.confirms.map((item) => {
			slackIds.push(item.manager.slackId);
			emails.push(item.manager.email);
		});
		if (user.head && !slackIds.includes(user.head.slackId)) slackIds.push(user.head.slackId);
		await this.plannedDayoffsService.postManagerMessage(request, slackIds, user);

		const firstEmailList = [];
		const secondEmailList = [];
		const thirdEmailList = [];
		let pmEmailList;

		if (request.employee.pmApprove) {
			pmEmailList = request.confirms.map((pm) => pm.manager.email);
			secondEmailList.push(...pmEmailList);
		}

		if (user.head) {
			secondEmailList.push(request.employee.head.email);
		}

		secondEmailList.push(request.employee.email);

		if (request.workingOff) {
			this.dayoffCancelWithoutOk(thirdEmailList, {
				request,
				from: this.messages('{from , date, long}', { from: request.from }),
				shortDays: this.messages(
					'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
					{ days: request.days }
				),
				to: this.messages('{to , date, long}', { to: request.to }),
			});
		} else {
			this.dayoffCancelForFinDep(firstEmailList, {
				request,
				from: this.messages('{from , date, long}', { from: request.from }),
				shortDays: this.messages(
					'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
					{ days: request.days }
				),
				to: this.messages('{to , date, long}', { to: request.to }),
			});
		}

		this.dayoffCancelForEmployee(secondEmailList, {
			request,
			from: this.messages('{from , date, long}', { from: request.from }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
		});

		await ack({ response_action: 'push', view });
		await this.renderDayoffList({ ack, views, user });
	}

	@Cron(CronExpression.EVERY_DAY_AT_6PM) // 21:00 Moscow time
	@SentryOverwatch({ module: 'dayoff', job: 'dayoff-overdue' })
	async checkOverdueVacations() {
		const today = new Date();
		const yesterday = subDays(today, 1);

		const awaitingDayoffRequests = await this.requestService.findAwaitingRequests();

		awaitingDayoffRequests.forEach(async (dayoffRequests) => {
			const isDaysMatch = isSameDay(new Date(dayoffRequests.from), yesterday);
			if (!isDaysMatch) return;

			try {
				await this.requestService.changeAwaitingStatusToAutoReject(dayoffRequests.id);

				await this.client.chat.postMessage({
					text: 'Автоотмена отгула',
					channel: dayoffRequests.employee.slackId,
					blocks: [
						mkdown(
							this.messages(
								'<@{emp}>, твой отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from , date, long}' +
									' по {to , date, long} отменен системой, поскольку не был согласован руководителями до даты начала.' +
									' Если нужна помощь с этим запросом, пожалуйста, свяжись с руководителем или HR-отделом',
								{
									emp: dayoffRequests.employee.slackId,
									days: dayoffRequests.days,
									from: dayoffRequests.from,
									to: dayoffRequests.to,
								}
							)
						),
						divider(),
					],
				});
			} catch (error) {
				captureException(error, { module: 'dayoff', job: 'dayoff-overdue' });
			}
		});
	}
}
