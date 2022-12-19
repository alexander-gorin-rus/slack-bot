import { Injectable } from '@nestjs/common';
import { Block, View, KnownBlock } from '@slack/types';
import { WebClient } from '@slack/web-api';
import { ActionsEnum } from '../../configs/actions';
import { Employee } from '../../database/entity/employee.entity';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { wordForm } from '../../lib/functions';
import { button } from '../../templates/button';
import { divider } from '../../templates/divider';
import { mkdown } from '../../templates/mkdown';
import { staticSelectCustom } from '../../templates/staticSelect';
import { Messages } from '../../main/messages.service';
import { PlainTextOption } from '@slack/types';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { SellRequestService } from '../../database/service/sell.service';
import { settings } from '../../configs/settings';
import { CalendarService } from '../../calendar/calendar.service';

@Injectable()
export class PlannedVacationsService {
	private vacationTitleTpl =
		'Дата начала отпуска - `{from, date, long}`, конец - `{to, date, long}`, продолжительность - `{days}` {days, plural, one {день} few {дня} many {дней} other {}}';

	constructor(
		private vacationRequestService: VacationRequestService,
		private sellRequestService: SellRequestService,
		private client: WebClient,
		private messages: Messages,
		private calendar: CalendarService
	) {}

	private getNotExpiredVacations(vacations: VacationRequest[]): VacationRequest[] {
		const today = this.calendar.today().setHours(0, 0, 0, 0);
		return vacations.filter((vacation) => new Date(vacation.from).getTime() > today);
	}

	// Главная Фн сервиса, который вызывает все остальные функции
	public async main(user: Employee): Promise<Array<Block>> {
		const employeeId = user.id;
		const awaitingConfirmationRequests = await this.awaitingConfirmation(employeeId);
		const confirmedRequests = await this.confirmed(employeeId);
		const fields: Block[] = [];

		if (awaitingConfirmationRequests.length) {
			fields.unshift(divider());
			fields.unshift(...awaitingConfirmationRequests);
		}

		if (confirmedRequests.length) {
			fields.unshift(divider());
			fields.unshift(...confirmedRequests);
		}

		if (awaitingConfirmationRequests.length || confirmedRequests.length) {
			fields.unshift(...(await this.countVacation(user)));
			const buttonShowFirstModal = await this.buttonShowFirstModal(user);
			buttonShowFirstModal && fields.push(buttonShowFirstModal);
		} else {
			fields.push(...this.empty(user));
		}

		fields.push(button('На главную', ActionsEnum.RETURN_HOME));
		return fields;
	}

	// Секция с ожидающими отпусками
	public async awaitingConfirmation(employeeId: number) {
		const allVacationList = await this.vacationRequestService.findVacationRequests(
			employeeId,
			'wait'
		);
		const vacationList: VacationRequest[] = this.getNotExpiredVacations(allVacationList);
		const blocks: KnownBlock[] = [];

		if (vacationList.length > 0) {
			const vacationTitles = vacationList
				.splice(vacationList.length - 11, 10)
				.map((req) => this.messages(this.vacationTitleTpl, req));
			blocks.push({
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `*Ожидают подтверждения*. ${
						vacationList.length > 10 ? '( отображаются последние 10 )' : ''
					}`,
				},
				fields: [
					{
						type: 'mrkdwn',
						text: vacationTitles.join('\n\n') + '',
					},
				],
			});
		}

		return blocks;
	}

	// Секция с подтвержденными отпусками
	public async confirmed(employeeId: number) {
		const allVacationList = await this.vacationRequestService.findVacationRequests(
			employeeId,
			'approved'
		);
		const vacationList = this.getNotExpiredVacations(allVacationList);

		const blocks: KnownBlock[] = [];

		if (vacationList.length > 0) {
			const vacationTitles = vacationList
				.splice(vacationList.length - 11, 10)
				.map((req) => this.messages(this.vacationTitleTpl, req));
			blocks.push({
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `*Утвержденные*. ${
						vacationList.length > 10 ? '( отображаются последние 10 )' : ''
					}`,
				},
				fields: [
					{
						type: 'mrkdwn',
						text: vacationTitles.join('\n\n') + '',
					},
				],
			});
		}

		return blocks;
	}

	// Секция с отказанными отпусками
	public async rejected(employeeId: number) {
		const vacationList = await this.vacationRequestService.findVacationRequests(
			employeeId,
			'rejected'
		);

		const blocks: KnownBlock[] = [];

		if (vacationList.length > 0) {
			const vacationTitles = vacationList
				.splice(vacationList.length - 11, 10)
				.map((req) => this.messages(`${this.vacationTitleTpl}\n\n`, req));

			blocks.push({
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `*Отклоненные*. ${vacationList.length > 10 ? '( отображаются последние 10 )' : ''}`,
				},
				fields: [
					{
						type: 'mrkdwn',
						text: vacationTitles.join('\n\n') + '',
					},
				],
			});
		}

		return blocks;
	}

	// Заголовок об отсутствие запланированных отпусков
	public empty(user: Employee) {
		return [mkdown(`*<@${user.slackId}>, у тебя нет запланированного отпуска*`)];
	}

	// Кнопка для открытия модакли
	public async buttonShowFirstModal(user: Employee) {
		const vacationList = await this.vacationRequestService.findVacationRequests(
			user.id,
			'waitAndApproved'
		);
		if (vacationList && vacationList.length) {
			return button('Отменить отпуск', ActionsEnum.DELETE_VACATION_ACTION);
		}
		return null;
	}

	// Количество отпусков(не отклоненных)
	public async countVacation(user: Employee): Promise<Array<any>> {
		const plannedVacations = await this.vacationRequestService.count(user.id);

		return [
			mkdown(
				`*<@${user.slackId}>, у тебя \`${plannedVacations}\` ${wordForm(plannedVacations, [
					'запланированный отпуск',
					'запланированных отпуска',
					'запланированных отпусков',
				])}*`
			),
			divider(),
		];
	}

	// 1-модалка
	public async selectVacation(employeeId: number, triggerId: string): Promise<any> {
		const allVacationList = await this.vacationRequestService.findVacationRequests(
			employeeId,
			'waitAndApproved'
		);
		const vacationList: VacationRequest[] = this.getNotExpiredVacations(allVacationList);

		const formattedVacationDates: PlainTextOption[] = [];
		vacationList.forEach((opt: VacationRequest) => {
			formattedVacationDates.push({
				value: opt.id.toString(),
				text: {
					type: 'plain_text',
					text: this.messages(
						'Отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {from, date, long} по {to, date, long}',
						{
							from: opt.from,
							days: opt.days,
							to: opt.to,
						}
					),
				},
			});
		});

		return {
			trigger_id: triggerId,
			view: {
				callback_id: ActionsEnum.DELETE_VAC_DECISION,
				type: 'modal',
				title: {
					type: 'plain_text',
					text: 'Отмена отпуска',
				},
				blocks: [
					divider(),
					staticSelectCustom(
						formattedVacationDates,
						'delete_vacation',
						'delete_vacation',
						'Отпуск',
						'Выбери отпуск для отмены'
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

	async decision(formData): Promise<any> {
		const vacRequest = await this.vacationRequestService.getById(formData.delete_vacation);
		const sellRequest = await this.sellRequestService.findPlannedAfterVacRequest(
			formData.delete_vacation
		);
		const block = { blocks: [] };
		block.blocks.push(
			divider(),
			mkdown(
				this.messages(
					'Ты уверен что хочешь отменить отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {from, date, long} по {to, date, long}?',
					{ days: vacRequest.days, from: vacRequest.from, to: vacRequest.to }
				)
			)
		);
		if (sellRequest) {
			block.blocks.push(
				mkdown(
					this.messages(
						'При отмене этого отпуска отменится и запланированная продажа {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
							' с {from, date, long} по {to, date, long}',
						{
							days: sellRequest.days,
							from: sellRequest.from,
							to: sellRequest.to,
						}
					)
				)
			);
		}
		block.blocks.push(
			button(
				'Отправить запрос',
				ActionsEnum.DELETE_VACATION_BY_ID,
				JSON.stringify(Number(formData.delete_vacation))
			)
		);
		return {
			view: {
				type: 'modal',
				title: {
					type: 'plain_text',
					text: 'Отмена отпуска',
				},
				...block,
			},
		};
	}
	// 2-модалка
	async confirmingDeleteModal({ vacationReqId, say, user }): Promise<View> {
		const id = vacationReqId;
		const vacation = await this.vacationRequestService.findOneByVacReqId(id);
		this.postMessageAboutReject({ vacation, say, user });
		return {
			type: 'modal',
			callback_id: 'selectVacationDays',
			clear_on_close: true,
			title: {
				type: 'plain_text',
				text: 'Отмена отпуска',
			},
			blocks: [
				mkdown(
					this.messages(
						'Я отправил запрос на отмену отпуска. \nОтпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {now, date, long} по {to, date, long}',
						{ now: vacation.from, days: vacation.days, to: vacation.to }
					)
				),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	vacationAlreadyDeleted(request: VacationRequest): View {
		return {
			type: 'modal',
			callback_id: 'selectVacationDays',
			clear_on_close: true,
			title: {
				type: 'plain_text',
				text: 'Отмена отпуска',
			},
			blocks: [
				mkdown(
					this.messages(
						'Я отправил запрос на отмену отпуска. \nОтпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {now, date, long} по {to, date, long}',
						{ now: request.from, days: request.days, to: request.to }
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
	async postMessageAboutReject({ say, user, vacation }) {
		const formattedVacationDates = {};
		formattedVacationDates[vacation.id] = this.messages(
			'Отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {now, date, long} по {to, date, long}',
			{ now: vacation.from, days: vacation.days, to: vacation.to }
		);
		await say({
			text: 'Решение на отпуск отправлено',
			blocks: [
				mkdown(
					this.messages(
						'Ты отклонил отпуск <@{slackId}> на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
							' c {now, date, long} по {to, date, long} Твоё решение отправлено',
						{
							now: vacation.from,
							days: vacation.days,
							slackId: user.slackId,
							to: vacation.to,
						}
					)
				),
			],
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
	}

	// eslint-disable-next-line require-await
	async postManagerMessage(
		{ days, from, to }: VacationRequest,
		managers: string[],
		user: Employee
	): Promise<void> {
		managers.map(async (item) => {
			await this.client.chat.postMessage({
				text: 'Сотрудник отменил отпуск',
				channel: item,
				blocks: [
					mkdown(
						this.messages(
							'Сотрудник <@{user}> отозвал запрос на отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
								' c {from, date, long} по {to, date, long}',
							{ from, days, to, user: user.slackId }
						)
					),
					divider(),
				],
			});
		});
	}

	cancel(): any {
		return {
			type: 'modal',
			callback_id: 'cancelSelect',
			clear_on_close: true,
			title: {
				type: 'plain_text',
				text: 'Отмена отпуска',
			},
			blocks: [
				mkdown(
					`К сожалению, отмена отпуска менее чем за ${settings.minDaysBeforeVacation} рабочих дня до его начала через бота невозможна.`
				),
				mkdown('Пожалуйста, согласуй отмену лично с отделами кадров и финансов.'),
				mkdown('Представителей обоих отделов можешь найти на доске Трелло - Сотрудники.'),
				mkdown('https://trello.com/b/DYJeI4iS/umbrella-it-employees'),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}
}
