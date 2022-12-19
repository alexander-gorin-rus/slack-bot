import { Injectable } from '@nestjs/common';
import { Employee } from '../../database/entity/employee.entity';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { KnownBlock } from '@slack/web-api';
import { VacationPlanInterface } from './vacation-plan.interface';
import { divider } from '../../templates/divider';
import { mkdown } from '../../templates/mkdown';
import { staticSelect } from '../../templates/staticSelect';
import { datePicker } from '../../templates/datePicker';
import { ActionsEnum } from '../../configs/actions';
import { section } from '../../templates/section';
import { multiSelect } from '../../templates/multiSelect';
import { button } from '../../templates/button';
import { Messages } from '../../main/messages.service';
import { BoltLogger } from '../../_services/logger';
import { isNoPMSelected } from '../../utils';
import { addDays, round, wordForm } from '../../lib/functions';

@Injectable()
export class ViewService {
	constructor(private messages: Messages) {}

	main(user: Employee, pmList: Record<string, string>): any {
		const days = round(user.days);
		const elements = {};

		for (let i = 1; i < 15; i++) {
			elements[i] = String(i + wordForm(i, [' день', ' дня', ' дней']));
		}

		const block = {
			blocks: [
				divider(),
				mkdown(
					this.messages(
						// eslint-disable-next-line max-len
						'Тебе {days, plural, one {доступен} few {доступно} many {доступно} other {}} {days} {days, plural,  one {отпускной день} few {отпускных дня} many {отпускных дней} other {}}',
						{ days }
					)
				),
				mkdown('*Выбери желаемую дату начала и длительность отпуска.*'),
				staticSelect(elements, 'vacationDays', 'days', 'Выбрать дни', 'Продолжительность отпуска'),
				datePicker('Выбрать дату', 'Планируемая дата начала отпуска', 'date', 'date'),
			],
		};

		block.blocks.push(
			multiSelect(
				pmList,
				'multiUserSelect',
				'pmSlackIds',
				'Выбери ПМ-ов, на проектах которых ты работаешь',
				'Выбери ПМ-ов, на проектах которых ты работаешь'
			)
		);

		return {
			callback_id: ActionsEnum.VACATION_PLAN,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Планирование отпуска',
			},
			...block,
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

	confirm(reqDays: string, formData: VacationPlanInterface, warnings: any): any {
		const to = addDays(formData.date, Number(reqDays) - 1);
		const result = {
			callback_id: 'vacation_send',
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Планирование отпуска',
			},
			blocks: [
				mkdown(
					this.messages(
						'Отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long}',
						{ days: reqDays, from: formData.date, to }
					)
				),
			] as KnownBlock[],
			close: {
				type: 'plain_text',
				text: 'Назад к редактированию',
			},
			submit: {
				type: 'plain_text',
				text: 'Отправить запрос',
			},
		};
		const hasWarnings = warnings.length > 0;
		result.blocks = result.blocks.concat(warnings);
		if (isNoPMSelected(formData.pmSlackIds)) {
			result.blocks.push(
				mkdown('У тебя нет ПМов, поэтому запрос будет направлен твоему прямому руководителю.')
			);
		}

		// TODO: do we really need to point it in that manner?
		const specialVacationWord = hasWarnings ? 'подобный ' : '';
		result.blocks.push(section(`Отправить запрос на ${specialVacationWord}отпуск?`));

		return result;
	}

	done(request: VacationRequest): any {
		return {
			callback_id: 'vacationApprove',
			clear_on_close: true,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Планирование отпуска',
			},
			blocks: [
				section(
					this.messages(
						'Запрос на отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long} успешно отправлен!',
						{ days: request.days, from: request.from, to: request.to }
					)
				),
				section('Ты можешь следить за ходом обработки заявки в сообщениях бота.'),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	offerSaleVacationDays(formData: VacationPlanInterface, user: Employee, result) {
		const formDataDays = round(Number(formData.days));
		const to = new Date(
			new Date(formData.date).setDate(
				new Date(formData.date).getDate() + (Number(formData.days) + Number(formData.addDays) - 1)
			)
		);

		if (formDataDays < 14) {
			result.blocks.push({ type: 'divider' });
			result.blocks.push(
				mkdown(
					this.messages(
						':exclamation: Если ты возьмешь отпуск на {days} {days, plural, one {день} few {дня} many {дней} other {}} с {from, date, long} по {to, date, long},' +
							' то до конца года ты уже не сможешь уйти в цельный 14-дневный отпуск, положенный тебе по закону,' +
							' потому что у тебя не хватит доступных дней отпуска. Рекомендую увеличить продолжительность отпуска' +
							' или запланировать продажу сразу после него, чтобы соблюсти закон.',
						{ days: formDataDays, from: formData.date, to }
					)
				),
				button(
					'Запланировать продажу',
					ActionsEnum.SELL_AFTER_PLAN_VACATION,
					JSON.stringify(formData)
				)
			);
		} else {
			new BoltLogger().error('Что то пошло не так [view.serivce.ts]');
		}
	}
}
