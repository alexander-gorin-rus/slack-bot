import { Injectable } from '@nestjs/common';
import { Block, View } from '@slack/types';
import { WebClient } from '@slack/web-api';
import { ActionsEnum } from '../../configs/actions';
import { Employee } from '../../database/entity/employee.entity';
import { HelperService } from '../../main/helper.service';
import { button } from '../../templates/button';
import { divider } from '../../templates/divider';
import { mkdown } from '../../templates/mkdown';
import { staticSelect } from '../../templates/staticSelect';
import { Messages } from '../../main/messages.service';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { DayoffRequest } from '../../database/entity/dayoff-request.entity';
import { messageFormat } from '../../utils';

@Injectable()
export class PlannedDayoffsService {
	private dayoffTitleTpl =
		'Дата начала отгула - `{from, date, long}`, конец - `{to, date, long}`, продолжительность - `{days}`' +
		' {days, plural, one {день} few {дня} many {дней} other {}}';

	constructor(
		private dayoffRequestService: DayoffRequestService,
		private helperService: HelperService,
		private client: WebClient,
		private messages: Messages
	) {}

	public async main(user: Employee): Promise<Array<Block>> {
		const employeeId = user.id;
		const awaitingConfirmationRequests = await this.awaitingConfirmation(employeeId);
		const confirmedRequests = await this.confirmed(employeeId);
		const fields = [];

		if (awaitingConfirmationRequests) {
			fields.unshift(divider());
			fields.unshift(...awaitingConfirmationRequests);
		}
		if (confirmedRequests) {
			fields.unshift(divider());
			fields.unshift(...confirmedRequests);
		}
		if (awaitingConfirmationRequests || confirmedRequests) {
			fields.unshift(...(await this.countDayoff(user)));
			const buttonShowFirstModal = await this.buttonShowFirstModal(user);
			buttonShowFirstModal && fields.push(buttonShowFirstModal);
		} else {
			fields.push(...this.empty(user));
		}
		fields.push(button('На главную', ActionsEnum.RETURN_HOME));
		return fields;
	}

	public async awaitingConfirmation(employeeId: number) {
		const dayoffList = await this.dayoffRequestService.findDayoffRequests(employeeId, 'wait');
		if (dayoffList.length > 0) {
			const dayoffTitles = dayoffList
				.splice(dayoffList.length - 11, 10)
				.map((req) => this.messages(this.dayoffTitleTpl, req));
			const blocks = [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: `*Ожидают подтверждения*. ${
							dayoffList.length > 10 ? '( отображаются последние 10 )' : ''
						}`,
					},
					fields: [
						{
							type: 'mrkdwn',
							text: dayoffTitles.join('\n\n') + '',
						},
					],
				},
			];
			return blocks;
		}
	}

	public async confirmed(employeeId: number) {
		const dayoffList = await this.dayoffRequestService.findDayoffRequests(employeeId, 'approved');
		if (dayoffList.length > 0) {
			const dayoffTitles = dayoffList
				.splice(dayoffList.length - 11, 10)
				.map((req) => this.messages(this.dayoffTitleTpl, req));
			const blocks = [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: `*Утвержденные*. ${
							dayoffList.length > 10 ? '( отображаются последние 10 )' : ''
						}`,
					},
					fields: [
						{
							type: 'mrkdwn',
							text: dayoffTitles.join('\n\n') + '',
						},
					],
				},
			];
			return blocks;
		}
	}

	public async rejected(employee_id: number) {
		const dayoffList = await this.dayoffRequestService.findDayoffRequests(employee_id, 'rejected');

		if (dayoffList.length > 0) {
			const dayoffTitles = dayoffList
				.splice(dayoffList.length - 11, 10)
				.map((req) => this.messages(this.dayoffTitleTpl, req));
			const blocks = [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: `*Отклоненные*. ${dayoffList.length > 10 ? '( отображаются последние 10 )' : ''}`,
					},
					fields: [
						{
							type: 'mrkdwn',
							text: dayoffTitles.join('\n\n'),
						},
					],
				},
			];
			return blocks;
		}
	}

	public empty(user: Employee) {
		return [mkdown(`*<@${user.slackId}>, у тебя нет запланированного отгула*`)];
	}

	// Кнопка для открытия модакли
	public async buttonShowFirstModal(user: Employee) {
		const dayoffList = await this.dayoffRequestService.findDayoffRequests(
			user.id,
			'waitAndApproved'
		);
		if (dayoffList && dayoffList.length) {
			return button('Отменить отгул', ActionsEnum.DELETE_DAYOFF_ACTION);
		}

		return null;
	}

	// Количество отпусков(не отклоненных)
	public async countDayoff(user: Employee): Promise<Array<any>> {
		const plannedDayoffs = await this.dayoffRequestService.count(user.id);

		return [
			mkdown(
				messageFormat(
					'*<@{slackId}>, у тебя {days} {days, plural, one {запланированный отгул} few {запланированных отгула} many {запланированных отгулов} other {}}*',
					{ slackId: user.slackId, days: plannedDayoffs }
				)
			),
			divider(),
		];
	}

	// 1-модалка
	public async selectDayoff(employeeId: number, triggerId: string): Promise<any> {
		const dayoffList = await this.dayoffRequestService.findDayoffRequests(
			employeeId,
			'waitAndApproved'
		);

		const formattedDayoffDates = {};
		for (const dayoff in dayoffList) {
			formattedDayoffDates[dayoffList[dayoff].id] = this.messages(
				'Отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {now, date, long} по {to, date, long}',
				{
					now: dayoffList[dayoff].from,
					days: dayoffList[dayoff].days,
					to: dayoffList[dayoff].to,
				}
			);
		}

		return {
			trigger_id: triggerId,
			view: {
				callback_id: 'deleteDayoffById',
				type: 'modal',
				title: {
					type: 'plain_text',
					text: 'Отмена отгула',
				},
				blocks: [
					divider(),
					staticSelect(
						formattedDayoffDates,
						'delete_dayoff',
						'delete_dayoff',
						'Отгул',
						'Выбери отгул для отмены'
					),
				],
				close: {
					type: 'plain_text',
					text: 'Закрыть',
				},
				submit: {
					type: 'plain_text',
					text: 'Отправить запрос',
				},
			},
		};
	}

	// 2-модалка
	async confirmingDeleteModal({ dayoffReqId, say, user }): Promise<View> {
		const id = dayoffReqId;
		const dayoff = await this.dayoffRequestService.findOneByReqId(id);
		this.postMessageAboutReject({ dayoff, say, user });
		return {
			type: 'modal',
			callback_id: 'selectDayoffDays',
			clear_on_close: true,
			title: {
				type: 'plain_text',
				text: 'Отмена отгула',
			},
			blocks: [
				mkdown(
					this.messages(
						'Я отправил запрос на отмену отгула.\nОтгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {now, date, long} по {to, date, long}',
						{ days: dayoff.days, now: dayoff.from, to: dayoff.to }
					)
				),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	// Отправка сообщение в чат
	async postMessageAboutReject({ say, user, dayoff }) {
		const formattedDayoffDates = {};
		formattedDayoffDates[dayoff.id] = this.messages(
			'Отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {now, date, long} по {to, date, long} по причине: "{reason}"',
			{
				now: dayoff.from,
				days: dayoff.days,
				reason: dayoff.reason,
				to: dayoff.to,
			}
		);
		await say({
			text: 'Решение на отгул отправлено',
			blocks: [
				mkdown(
					this.messages(
						'Ты отклонил отгул <@{slackId}> на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
							' c {now, date, long} по {to, date, long} Твоё решение отправлено.',
						{
							now: dayoff.from,
							days: dayoff.days,
							slackId: user.slackId,
							to: dayoff.to,
						}
					)
				),
			],
		});
		await this.client.chat.postMessage({
			text: 'Отклонить отгул',
			channel: user.slackId,
			blocks: [
				mkdown(
					this.messages(
						'Отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {now, date, long} ' +
							'по {to, date, long} по причине: "{reason}" ' +
							'отменен по твоему запросу. \nЯ отправил тебе на почту письмо - проверь его.',
						{
							now: dayoff.from,
							days: dayoff.days,
							reason: dayoff.reason,
							to: dayoff.to,
						}
					)
				),
				divider(),
			],
		});
	}

	// eslint-disable-next-line require-await
	async postManagerMessage(
		request: DayoffRequest,
		managers: string[],
		user: Employee
	): Promise<void> {
		managers.map(async (item) => {
			await this.client.chat.postMessage({
				text: 'Сотрудник отменил отгул',
				channel: item,
				blocks: [
					mkdown(
						this.messages(
							'Сотрудник <@{user}> отозвал запрос на отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
								' c {from, date, long} по {to, date, long}',
							{ ...request, user: user.slackId }
						)
					),
					divider(),
				],
			});
		});
	}

	cancel(type: 'today16pm' | 'nonWork'): View {
		const block = { blocks: [] };
		if (type === 'today16pm') {
			block.blocks.push(
				mkdown('К сожалению, отмена отгула позже 16:00 MSK через бота невозможна.'),
				mkdown('Пожалуйста, согласуй отмену лично с отделами кадров и финансов.'),
				mkdown('Представителей обоих отделов можешь найти на доске Трелло - Сотрудники.'),
				mkdown('https://trello.com/b/DYJeI4iS/umbrella-it-employees')
			);
		} else if (type === 'nonWork') {
			block.blocks.push(
				mkdown('К сожалению, отмена отгула в выходные и праздничные дни невозможна.'),
				mkdown(
					'Пожалуйста, отмени отгул в рабочий день, иначе твое сообщение об отмене могут не увидеть.'
				)
			);
		}
		return {
			type: 'modal',
			callback_id: 'cancelSelect',
			clear_on_close: true,
			title: {
				type: 'plain_text',
				text: 'Отмена отгула',
			},
			...block,
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}
}
