import { Controller } from '@nestjs/common';
import { Option, ViewsOpenArguments, WebClient } from '@slack/web-api';
import { ActionsEnum } from '../configs/actions';
import { SellRequest } from '../database/entity/sell.entity';
import { SellRequestService } from '../database/service/sell.service';
import { EmailSender } from '../main/email-message-option.interface';
import { EmailTpl } from '../main/email-tpl.decorator';
import { Messages } from '../main/messages.service';
import { Context } from '../slack-bot/context/context';
import { Action } from '../slack-bot/decorator/action.decorator';
import { View } from '../slack-bot/decorator/view.decorator';
import { SellService } from './sell.service';
import { button } from '../templates/button';
import { divider } from '../templates/divider';
import { mkdown } from '../templates/mkdown';
import { section } from '../templates/section';
import { VacationDayChange } from '../database/entity/vacation-day-change.entity';
import { header } from '../templates/header';
import { VacationRequestService } from '../database/service/vacation-request.service';
import { VacationRequestStatus } from '../database/util/vacation-request-status.enum';
import { KafkaService } from '../kafka/kafka.service';
import { TOPICS_LIST } from '../configs/topics';
import {
	getKafkaDaysChangeData,
	getKafkaEmployeeRejectVacationData,
} from '../kafka/utils/tranformers';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../database/util/vacation-day-change-type-of-initiatior.enum';
import { CalendarService } from '../calendar/calendar.service';
import { settings } from '../configs/settings';

@Controller('plannedSellController')
export class PlannedSellController {
	@EmailTpl('sellCancelForFinDep') sellCancelForFinDep: EmailSender;
	@EmailTpl('sellCancelForEmployee') sellCancelForEmployee: EmailSender;
	@EmailTpl('vacationCancelForEmployee') vacationCancelForEmployee: EmailSender;
	@EmailTpl('vacationCancelForFinDep') vacationCancelForFinDep: EmailSender;

	constructor(
		private sellService: SellService,
		private client: WebClient,
		private messages: Messages,
		private sellRequestService: SellRequestService,
		private kafkaService: KafkaService,
		private vacationRequestService: VacationRequestService,
		private calendar: CalendarService
	) {}

	@Action(ActionsEnum.PLANNED_SELLS)
	async renderSellsList({ ack, views, user }: Context) {
		await ack();
		const sellRequests = await this.sellRequestService.findActive(user.id);
		const block = { blocks: [] };
		if (sellRequests.length) {
			block.blocks.push(header('Запланированные продажи'), divider());
			sellRequests.map((request) => {
				block.blocks.push(
					mkdown(
						this.messages(
							'Запрос на продажу `{days}` {days, plural, one {дня} few {дней} many {дней} other {}} отпуска с `{from, date, long}` по `{to, date, long}`',
							{ days: request.days, from: request.from, to: request.to }
						)
					)
				);
			});

			if (sellRequests.length) {
				block.blocks.push(button('Отменить продажу', ActionsEnum.DELETE_SELL));
			}
		} else {
			block.blocks.push(section('У тебя нет запланированных продаж'));
		}
		block.blocks.push(button('На главную', ActionsEnum.RETURN_HOME));
		await views.publish({
			user_id: user.slackId,
			view: {
				type: 'home',
				...block,
			},
		});
	}

	@View(ActionsEnum.DELETE_SELL_DECISION)
	async deleteVacDecsion({ ack, formData }: Context) {
		const view = await this.sellService.deleteSellDecision(formData);
		await ack({ response_action: 'push', ...view });
	}

	@Action(ActionsEnum.DELETE_SELL)
	async choseSellToDelete({ ack, views, user, triggerId }: Context) {
		await ack();
		const sellList = await this.sellRequestService.findActive(user.id);
		const formattedSellDates: Option[] = [];

		sellList.forEach((opt: SellRequest) => {
			formattedSellDates.push({
				value: opt.id.toString(),
				text: {
					type: 'plain_text',
					text: this.messages(
						'Продажа {days} {days, plural, one {дня} few {дней} many {дней} other {}} с {now, date, long} по {to, date, long}',
						{
							now: opt.from,
							days: opt.days,
							to: opt.to,
						}
					),
				},
			});
		});
		const view = this.sellService.sellCancel(formattedSellDates, triggerId) as ViewsOpenArguments;
		await views.open(view);
	}

	@Action(ActionsEnum.DELETE_SELL_BY_ID)
	async modalConfirm({ views, ack, user, actionData, viewId }: Context) {
		const request = await this.sellRequestService.getById(Number(actionData), [
			'employee',
			'employee.head',
		]);

		const daysToRequest = await this.calendar.getWorkDays(request.to);
		if (daysToRequest < settings.minDaysBeforeVacation) {
			const view = this.sellService.cancel();
			await views.update({ view_id: viewId, view });
			return;
		}

		if (request.vacationId && !request.status.includes('reject')) {
			await this.vacationRequestService.transaction(async (em) => {
				const vacation = await this.vacationRequestService.getById(request.vacationId, [
					'confirms',
					'confirms.manager',
					'employee',
					'employee.head',
				]);
				vacation.status = VacationRequestStatus.REJECTED_EMPLOYEE;
				this.kafkaService.sendMessage(
					TOPICS_LIST.EMPLOYEE_VACATION_CANCEL,
					getKafkaEmployeeRejectVacationData(vacation, user)
				);
				await this.vacationRequestService.save(vacation);

				const change = new VacationDayChange();
				change.employee = user;
				change.days = vacation.days;
				change.reason = this.messages(
					'Отменена отпуска {days} {days, plural, one {дня} few {дней} many {дней} other {}}, c {from, date, long} по {to, date, long}',
					vacation
				);
				change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION_CANCEL;
				change.globalId = vacation.globalId;
				await em.save(change);
				this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));

				const emails = [];
				const slackIds = [];
				vacation.confirms.map((item) => {
					slackIds.push(item.manager.slackId);
					emails.push(item.manager.email);
				});

				if (user.head) {
					slackIds.push(user.head.slackId);
				}

				const emailList = [];

				emailList.push(vacation.employee.email);

				this.vacationCancelForFinDep([], {
					request: vacation,
					from: this.messages('{from , date, long}', { from: vacation.from }),
					shortDays: this.messages(
						'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
						{ days: request.days }
					),
					to: this.messages('{to , date, long}', { to: vacation.to }),
				});

				this.vacationCancelForEmployee(emailList, {
					request: vacation,
					from: this.messages('{from , date, long}', { from: vacation.from }),
					shortDays: this.messages(
						'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
						{ days: vacation.days }
					),
					to: this.messages('{to , date, long}', { to: vacation.to }),
				});

				await this.client.chat.postMessage({
					text: 'Отклонить отпуск',
					channel: user.slackId,
					blocks: [
						mkdown(
							this.messages(
								'Отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {now, date, long} по {to, date, long}' +
									' отменен по твоему запросу. Я отправил тебе на почту письмо - проверь его.',
								{ now: vacation.from, days: vacation.days, to: vacation.to }
							)
						),
						divider(),
					],
				});

				slackIds.map(async (item) => {
					await this.client.chat.postMessage({
						text: 'Сотрудник отменил отпуск',
						channel: item,
						blocks: [
							mkdown(
								this.messages(
									'Сотрудник <@{user}> отозвал запрос на отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
										' c {from, date, long} по {to, date, long}',
									{
										from: vacation.from,
										days: vacation.days,
										to: vacation.to,
										user: user.slackId,
									}
								)
							),
							divider(),
						],
					});
				});
			});
		}

		const view = this.sellService.confirmingDeleteModal(request);

		await this.sellRequestService.delete(request.id);
		await this.sellRequestService.transaction(async (em) => {
			const change = new VacationDayChange();
			change.employee = user;
			change.days = request.days;
			change.reason = this.messages(
				'Отменена продажа {days} {days, plural, one {дня} few {дней} many {дней} other {}}, c {from, date, long} по {to, date, long}',
				request
			);
			change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_SALE_CANCEL;
			change.globalId = request.globalId;
			await em.save(change);
			await this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));
		});
		const emailList = [];
		emailList.push(request.employee.email);

		this.sellCancelForFinDep([], {
			request,
			from: this.messages('{from , date, long}', { from: request.from }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			days: this.messages(
				'{days} {days, plural, one {календарный день} few {календарных дня} many {календарных дней} other {}}',
				{ days: request.days }
			),
			to: this.messages('{to , date, long}', { to: request.to }),
		});

		this.sellCancelForEmployee(emailList, {
			request,
			from: this.messages('{from , date, long}', { from: request.from }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			days: this.messages(
				'{days} {days, plural, one {календарный день} few {календарных дня} many {календарных дней} other {}}',
				{ days: request.days }
			),
			to: this.messages('{to , date, long}', { to: request.to }),
		});
		const msg = this.sellService.cancelMessage(user.slackId, request);
		await this.client.chat.postMessage(msg);
		await views.update({ view_id: viewId, view });
		await this.renderSellsList({ ack, views, user });
	}
}
