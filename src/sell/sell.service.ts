import { Injectable } from '@nestjs/common';
import { Block, SectionBlock, View } from '@slack/web-api';
import { ActionsEnum } from '../configs/actions';
import { Employee } from '../database/entity/employee.entity';
import { SellRequest } from '../database/entity/sell.entity';
import { addDays, format_yyyy_mm_dd, range } from '../lib/functions';
import { HelperService } from '../main/helper.service';
import { Messages } from '../main/messages.service';
import { datePicker } from '../templates/datePicker';
import { divider } from '../templates/divider';
import { mkdown } from '../templates/mkdown';
import { staticSelectCustom } from '../templates/staticSelect';
import { textInput } from '../templates/textInput';
import { MAX_VAC_DAYS, MAX_VAC_DAYS_PER_YEAR, settings } from '../configs/settings';
import { setDate } from 'date-fns';
import { messageFormat } from '../utils/index';
import { VacationRequestService } from '../database/service/vacation-request.service';
import { SellRequestService } from '../database/service/sell.service';
import { button } from '../templates/button';

const DEFAULT_PREPAYMENT_DAYS_COUNT = 0;
const LAST_PREPAID_DAY = 15;

export interface PrepaymentDaysCount {
	isInFirstHalfOfTheMonth: boolean;
	prepaymentDaysCount: number;
}

interface VirtualDaysWarning {
	firstDay?: Employee['firstDay'];
	days: number;
	from: Date;
	to: Date;
	totalVacationDays: number;
	totalSelledDays: number;
}

interface SellDecision {
	days: number;
	from: Date;
	startOffset: number;
	isInFirstHalfOfTheMonth: boolean;
	prepaymentDaysCount: number;
	additionalDays: number;
	firstDay?: Employee['firstDay'];
	totalVacationDays: number;
	totalSelledDays: number;
	user: Employee;
}

@Injectable()
export class SellService {
	constructor(
		private helper: HelperService,
		private messages: Messages,
		private vacationRequestService: VacationRequestService,
		private requestSellService: SellRequestService
	) {}

	async getPrepaymentDaysCount(formData): Promise<PrepaymentDaysCount> {
		const date = new Date(formData.date);
		if (date.getDate() > LAST_PREPAID_DAY)
			return {
				isInFirstHalfOfTheMonth: false,
				prepaymentDaysCount: DEFAULT_PREPAYMENT_DAYS_COUNT,
			};

		const sellStartDate = format_yyyy_mm_dd(date);
		const year = date.getFullYear();
		const { holidays, weekends } = await this.helper.getCalendar(year);

		const monthNumber = date.getMonth();
		const nonWorkingDays = [...new Set(holidays.concat(weekends))].filter(
			(day) =>
				new Date(day).getMonth() === monthNumber && new Date(day).getDate() <= LAST_PREPAID_DAY
		);

		const dayRange = range(LAST_PREPAID_DAY, 1).map((dayNumber) => {
			return format_yyyy_mm_dd(setDate(date, dayNumber));
		});
		const allDaysInFirstHalf = dayRange;
		const workingDaysInFirstHalf = dayRange.filter((day) => !nonWorkingDays.includes(day));
		const startSellIndex = allDaysInFirstHalf.findIndex((day) => day === sellStartDate);
		const countDaysToSellInFirstHalf = allDaysInFirstHalf.slice(
			startSellIndex,
			startSellIndex + Number(formData.days)
		).length;

		return {
			isInFirstHalfOfTheMonth: true,
			prepaymentDaysCount: workingDaysInFirstHalf.length - countDaysToSellInFirstHalf,
		};
	}

	sellView(user: Employee): any {
		const days = this.helper.round(user.days);
		return {
			type: 'modal',
			callback_id: ActionsEnum.SELL_REQUEST,
			title: {
				type: 'plain_text',
				text: 'Продажа отпускных дней',
			},
			blocks: [
				divider(),
				mkdown(
					this.messages(
						'<@{user}>, напоминаем, что продажа отпуска документально оформляется как полноценный отпуск. Пожалуйста, убедись,' +
							' что в желаемые даты продажи отпуска у тебя нет командировок, иначе мы не сможем провести продажу в эти даты.',
						{ user: user.slackId }
					)
				),
				mkdown(
					this.messages(
						// eslint-disable-next-line max-len
						'Тебе {days, plural, one {доступен} few {доступно} many {доступно} other {}} {days} {days, plural,  one {отпускной день} few {отпускных дня} many {отпускных дней} other {}}',
						{ days }
					)
				),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
			submit: {
				type: 'plain_text',
				text: 'Продать дни отпуска',
			},
		};
	}

	sellReject(days: number): any {
		return {
			type: 'modal',
			callback_id: ActionsEnum.SELL_DAYS_ACTION,
			clear_on_close: true,
			title: {
				type: 'plain_text',
				text: 'Продажа отпускных дней',
			},
			blocks: [
				divider(),
				mkdown(
					messageFormat(
						'У тебя {days} {days, plural, one {отпускной день} few {отпускных дня} many {отпускных дней} other {}}, ты не можешь ничего продать.',
						{
							days,
						}
					)
				),
				mkdown('Подкопи дней и приходи позже'),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	sellPlan(days: number): any {
		const elements = {};
		if (days > 50) days = 50;
		for (let i = 1; i < days + 1; i++) {
			elements[i] = String(i);
		}
		return {
			type: 'modal',
			callback_id: ActionsEnum.SELL_DAYS_ACTION,
			clear_on_close: true,
			title: {
				type: 'plain_text',
				text: 'Продажа отпускных дней',
			},
			blocks: [
				divider(),
				mkdown(
					':information_source: Если продажа твоего отпуска приходится на первую половину месяца, то это повлияет на величину аванса.' +
						' Рабочие дни с 1 по 15 числа месяца, попадающие в период продажи отпуска, не войдут в расчет аванса.'
				),
				mkdown(
					'Рассчитать сумму выплаты ты можешь по формуле: твоя зарплата (до вычета НДФЛ) / 28 * кол-во продаваемых дней - 13%.'
				),
				mkdown('Подробности о датах и сумме ты можешь уточнить у финотдела.'),
				textInput('Сколько дней отпуска ты хочешь продать?', 'days', 'Дни отпуска'),
				datePicker('Дата продажи', 'Выбери день, в который инициировать продажу:', 'date', 'date'),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
			submit: {
				type: 'plain_text',
				text: 'Отправить запрос',
			},
		};
	}

	private async virtualDaysWarning(
		data: VirtualDaysWarning,
		user: Employee
	): Promise<SectionBlock[]> {
		if (!data.firstDay) return [];
		const days = Number(data.days);
		// ok, sold vacation is just other kind of vacation.
		// at least there are 14 days in one vacation block
		if (days >= MAX_VAC_DAYS) return [];
		const sellDaysWarning = mkdown(
			this.messages(
				'❗️Если ты продашь {days} {days, plural, one {день} other {дней}} с {from, date, long} по {to, date, long},' +
					' то до конца года ты уже не сможешь оформить цельный 14-дневный отпуск,' +
					' положенный тебе по закону, потому что у тебя не хватит доступных дней отпуска.' +
					' Рекомендую увеличить кол-во дней продажи или запланировать отпуск сразу после нее, чтобы соблюсти закон.',
				{
					days,
					from: data.from,
					to: data.to,
				}
			)
		);

		// calculation days vacancy and sell vacancy days
		const vacations = await this.vacationRequestService.findVacationRequestsForYear(user, true);
		const sellVacations = await this.requestSellService.findSellRequestsForYear(user, true);
		const vacationDays = [...vacations, ...sellVacations];
		const isVacationTwoWeeks = !!vacationDays.find(
			(vacation) => vacation.days === settings.twoWeek
		);

		const totalOrderedDays = data.totalVacationDays + data.totalSelledDays;
		const remainedVirtualDays = MAX_VAC_DAYS_PER_YEAR - (days + totalOrderedDays);

		if (remainedVirtualDays < MAX_VAC_DAYS && !isVacationTwoWeeks) {
			return [sellDaysWarning];
		} else return [];
	}

	async decision({
		days,
		from,
		startOffset,
		isInFirstHalfOfTheMonth,
		prepaymentDaysCount,
		additionalDays,
		firstDay,
		totalSelledDays,
		totalVacationDays,
		user,
	}: SellDecision): Promise<any> {
		const to = addDays(from, Number(days) - 1);
		const finalFrom = addDays(from, Number(startOffset));
		const finalTo = addDays(finalFrom, Number(days) + Number(additionalDays) - 1);
		const blockWarning =
			additionalDays > 0 || startOffset > 0
				? [
						mkdown(
							this.messages(
								':exclamation: Во время планируемой продажи отпуска будут праздники, поэтому дата продажа отпуска будет проведена с {from, date, long}' +
									' по {to, date, long}\nОфициальная дата окончания продажи отпуска - {to, date, long}',
								{ to: finalTo, from: finalFrom }
							)
						),
				  ]
				: [];

		const prepaidBlock = isInFirstHalfOfTheMonth
			? [
					mkdown(
						'Часть продажи отпуска попадает на первую половину месяца. Это влияет на размер аванса. Кол-во дней,' +
							` за которые будет начислен аванс: ${prepaymentDaysCount}. Выплата за остальные дни, отработанные в период продажи, будет осуществлена в день зарплаты.`
					),
			  ]
			: [];

		const sellDaysWarning = await this.virtualDaysWarning(
			{
				firstDay,
				days,
				from,
				to,
				totalSelledDays,
				totalVacationDays,
			},
			user
		);

		const result = {
			type: 'modal',
			callback_id: ActionsEnum.CONFRIM_SELL,
			clear_on_close: false,
			title: {
				type: 'plain_text',
				text: 'Продажа отпускных дней',
			},
			blocks: [
				divider(),
				mkdown(
					this.messages(
						'Продажа {days} {days, plural, one {отпускного дня} other {отпускных дней}} c {from, date, long} по {to, date, long}',
						{ days, from, to }
					)
				),
				...prepaidBlock,
				...blockWarning,
				...sellDaysWarning,
				mkdown('Ты уверен, что хочешь продать дни отпуска?'),
			],
			close: {
				type: 'plain_text',
				text: 'Нет',
			},
			submit: {
				type: 'plain_text',
				text: 'Да',
			},
		};

		return result;
	}

	decisionAfterVacation(days: number, date: string, sellEndDate: Date, errors: any): any {
		const result: any = {
			type: 'modal',
			callback_id: ActionsEnum.CONFRIM_SELL_AFTER_VAC,
			clear_on_close: false,
			title: {
				type: 'plain_text',
				text: 'Продажа отпускных дней',
			},
		};

		if (errors) {
			result.blocks = [divider(), mkdown(errors.date)];
			result.close = {
				type: 'plain_text',
				text: 'Назад к редактированию',
			};
		} else {
			result.blocks = [
				divider(),
				mkdown(
					this.messages(
						'Продажа {days} {days, plural, one {отпускного дня} other {отпускных дней}} c {now, date, long} по {to, date, long}' +
							' будет запланирована после подтверждения отпуска.',
						{ days, now: date, to: sellEndDate }
					)
				),
				mkdown('Ты уверен, что хочешь продать дни отпуска?'),
			];
			result.close = {
				type: 'plain_text',
				text: 'Нет',
			};
			result.submit = {
				type: 'plain_text',
				text: 'Да',
			};
		}

		return result;
	}

	async sellAfterVacCalc(calcFrom: Date) {
		let calendar;
		do {
			calcFrom = addDays(calcFrom, 1);
			calendar = await this.helper.prodCalendarCalculator(calcFrom, 1, 'vac');
		} while (calendar.decision == false);
		return calcFrom;
	}

	message(slackId: string, days: number, from: Date, to: Date): any {
		return {
			text: 'Продажа дней',
			channel: slackId,
			blocks: [
				mkdown(
					this.messages(
						'Я отправил твой запрос на продажу {days} {days, plural, one {отпускного дня} other {отпускных дней}} c {from, date, long} по {to, date, long}',
						{ days, from, to }
					)
				),
				mkdown(
					'Ожидай поступления денежных средств и письма из отдела кадров за несколько дней до даты начала продажи.'
				),
				mkdown(
					`:money_with_wings: _Запрос на продажу отпуска от: ${this.helper.convertDate(
						new Date()
					)}_`
				),
				divider(),
			],
		};
	}

	messageAfterPlanVacation(slackId: string, request: SellRequest): any {
		return {
			text: 'Продажа дней',
			channel: slackId,
			blocks: [
				mkdown(
					this.messages(
						'Твой запрос на продажу {days} {days, plural, one {отпускного дня} other {отпускных дней}} c {from, date, long} по {to, date, long}' +
							' будет отправлен после подтверждения отпуска.',
						{ days: request.days, from: request.from, to: request.to }
					)
				),
				mkdown(':money_with_wings: _Запрос на продажу_'),
				divider(),
			],
		};
	}

	cancelMessage(slackId: string, request: SellRequest): any {
		return {
			text: 'Продажа дней',
			channel: slackId,
			blocks: [
				mkdown(
					this.messages(
						'Я отправил запрос на отмену продажи дней отпуска.\nПродажа {days} {days, plural, one {дня} few {дней} many {дней} other {}}' +
							' c {now, date, long} по {to, date, long}',
						{ days: request.days, now: request.from, to: request.to }
					)
				),
				mkdown(
					`:money_with_wings: _Запрос на отмену продажи от: ${this.helper.convertDate(new Date())}_`
				),
				divider(),
			],
		};
	}

	async deleteSellDecision(formData): Promise<any> {
		const sellRequest = await this.requestSellService.getById(formData.delete_sell);
		const block = { blocks: [] };
		block.blocks.push(
			divider(),
			mkdown(
				this.messages(
					'Ты уверен что хочешь отменить продажу на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {from, date, long} по {to, date, long}?',
					{ days: sellRequest.days, from: sellRequest.from, to: sellRequest.to }
				)
			)
		);
		if (sellRequest.vacationId) {
			block.blocks.push(
				mkdown(
					this.messages(
						'При отмене этой продажи отменится и запланированный отпуск {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
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
				ActionsEnum.DELETE_SELL_BY_ID,
				JSON.stringify(Number(formData.delete_sell))
			)
		);
		return {
			view: {
				type: 'modal',
				title: {
					type: 'plain_text',
					text: 'Отмена Продажи',
				},
				...block,
			},
		};
	}

	sellCancel(formattedSellDates, triggerId) {
		return {
			trigger_id: triggerId,
			view: {
				callback_id: ActionsEnum.DELETE_SELL_DECISION,
				type: 'modal',
				title: {
					type: 'plain_text',
					text: 'Отмена продажи',
				},
				blocks: [
					divider(),
					staticSelectCustom(
						formattedSellDates,
						'delete_sell',
						'delete_sell',
						'Продажа',
						'Выбери продажу для отмены'
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

	cancel(): View {
		return {
			type: 'modal',
			callback_id: 'cancelSelect',
			clear_on_close: true,
			title: {
				type: 'plain_text',
				text: 'Отмена продажи',
			},
			blocks: [
				mkdown(
					`К сожалению, отмена продажи менее чем за ${settings.minDaysBeforeVacation} рабочих дня до её начала через бота невозможна.`
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

	confirmingDeleteModal(request): View {
		return {
			type: 'modal',
			callback_id: 'sellCancel',
			clear_on_close: true,
			title: {
				type: 'plain_text',
				text: 'Отмена продажи',
			},
			blocks: [
				mkdown(
					this.messages(
						'Я отправил запрос на отмену продажи дней отпуска.\nПродажа {days} {days, plural, one {дня} few {дней} many {дней} other {}}' +
							' c {now, date, long} по {to, date, long}',
						{ days: request.days, now: request.from, to: request.to }
					)
				),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	messageToHead(args): {
		text: string;
		channel: string;
		blocks: Array<Block>;
	} {
		return {
			text: 'Запрос на продажу дней отпуска',
			channel: args.head.slackId,
			blocks: [
				mkdown(
					this.messages(
						'Привет, <@{headSlackId}>! <@{empSlackId}> отправил(а) запрос на продажу отпускных дней,' +
							' после которой у него/нее останется 0 дней отпуска. Держу в курсе на всякий случай.',
						{
							headSlackId: args.head.slackId,
							empSlackId: args.userAfterSellVacationDays.slackId,
							days: args.userAfterSellVacationDays.userDays,
						}
					)
				),
			],
		};
	}
}
