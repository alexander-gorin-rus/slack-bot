import { Injectable } from '@nestjs/common';
import { ActionsEnum } from '../../configs/actions';
import { DayoffRequest } from '../../database/entity/dayoff-request.entity';
import { Employee } from '../../database/entity/employee.entity';
import { checkboxes } from '../../templates/checkboxes';
import { datePicker } from '../../templates/datePicker';
import { divider } from '../../templates/divider';
import { mkdown } from '../../templates/mkdown';
import { section } from '../../templates/section';
import { staticSelect } from '../../templates/staticSelect';
import { textInput } from '../../templates/textInput';
import { multiSelect } from '../../templates/multiSelect';
import { HelperService } from '../../main/helper.service';
import { Messages } from '../../main/messages.service';
import { isNoPMSelected } from '../../utils';
import { messageFormat } from '../../utils';
import { addDays } from '../../lib/functions';

@Injectable()
export class ViewService {
	constructor(private helper: HelperService, private messages: Messages) {}

	main(employee: Employee, pmList: Record<string, string>): any {
		const elements = {};
		for (let i = 1; i < 29; i++) {
			elements[i] = messageFormat(
				'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
				{ days: i }
			);
		}
		const block = {
			blocks: [
				divider(),
				staticSelect(
					elements,
					'vacationDays',
					'days',
					'Выбрать дни',
					'Cколько дней отгула ты хочешь взять?'
				),
			],
		};

		if (!employee.SPStatus) {
			block.blocks.push(
				checkboxes(
					['Отгул с отработкой'],
					'Планируешь отрабатывать отгул?',
					'workingOff',
					employee.SPStatus
				)
			);
		}

		block.blocks.push(
			datePicker('Выбери дату начала отгула', 'Планируемая дата начала отгула', 'date', 'date'),
			textInput('По какой причине ты хочешь взять отгул?', 'reason', 'Причина отгула'),
			multiSelect(
				pmList,
				'multiUserSelect',
				'pmSlackIds',
				'Выбери ПМ-ов, на проектах которых ты работаешь',
				'Выбери ПМ-ов, на проектах которых ты работаешь'
			)
		);

		return {
			callback_id: ActionsEnum.DAYOFF_PLAN,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Планирование отгула',
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

	// eslint-disable-next-line require-await
	async confirm(employee: Employee, formData, daysToAdd): Promise<any> {
		let to = addDays(formData.date, Number(formData.days) - 1);
		const result = {
			callback_id: ActionsEnum.DAYOFF_SEND,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Планирование отгула',
			},
			blocks: [
				mkdown(
					messageFormat(
						'Отгул с {now} по {to} на {days} {days, plural, one {день} few {дня} many {дней} other {}}.',
						{
							now: this.helper.convertDate(new Date(formData.date)),
							to: this.helper.convertDate(to),
							days: Number(formData.days),
						}
					)
				),
				mkdown(`Причина отгула - ${formData.reason}.`),
			],
			close: {
				type: 'plain_text',
				text: 'Назад',
			},
			submit: {
				type: 'plain_text',
				text: 'Отправить запрос',
			},
		};
		if (!employee.SPStatus) {
			result.blocks.push(
				mkdown(`Планируется отрабатывать - ${this.helper.boolToRus(Boolean(formData.workingOff))}`)
			);
		}

		if (isNoPMSelected(formData.pmSlackIds)) {
			result.blocks.push(
				mkdown('У тебя нет ПМов, поэтому запрос будет направлен твоему прямому руководителю.')
			);
		}

		if (daysToAdd != 0) {
			to = addDays(to, daysToAdd);
			// eslint-disable-next-line max-len
			result.blocks.push(
				mkdown(
					`:exclamation:Во время планируемого отгула будут праздники и выходные, поэтому дата окончания отгула будет увеличена до ${this.helper.convertDate(
						to
					)}`
				)
			);
		}

		return result;
	}

	done(employee: Employee, request: DayoffRequest): any {
		const result = {
			callback_id: 'dayoffApprove',
			clear_on_close: true,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Планирование отгула',
			},
			blocks: [
				mkdown(
					this.messages(
						'Запрос на отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}} c {from, date, long} по {to, date, long} успешно отправлен!',
						{ days: request.days, from: request.from, to: request.to }
					)
				),
				mkdown(`Причина отгула - ${request.reason}.`),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};

		if (!employee.SPStatus) {
			result.blocks.push(
				mkdown(`Планируется отрабатывать - ${this.helper.boolToRus(Boolean(request.workingOff))}`)
			);
		}

		// @ts-ignore
		result.blocks.push(section('Ты можешь следить за ходом обработки заявки в сообщениях бота.'));

		return result;
	}
}
