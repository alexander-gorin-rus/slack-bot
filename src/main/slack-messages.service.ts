import { Injectable } from '@nestjs/common';
import { HelperService } from './helper.service';
import { Messages } from './messages.service';
import { mkdown } from '../templates/mkdown';
import { divider } from '../templates/divider';
import { VacationRequest } from '../database/entity/vacation-request.entity';
import { SellRequest } from '../database/entity/sell.entity';

@Injectable()
export class SlackMessagesServices {
	constructor(private helper: HelperService, private messages: Messages) {}

	vacationPlannedMessage(
		slackId: string,
		request: VacationRequest,
		sellRequest?: SellRequest
	): any {
		const result = {
			text: 'Планирование отпуска',
			channel: slackId,
			blocks: [
				mkdown(
					this.messages(
						'Я отправил запрос на планирование отпуска на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
							' c {from, date, long} по {to, date, long}',
						{ days: request.days, from: request.from, to: request.to }
					)
				),
				divider(),
			],
		};

		if (sellRequest) {
			result.blocks.push(
				mkdown(
					this.messages(
						'Отпуску сопутствует продажа на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
							' c {from, date, long} по {to, date, long}' +
							'\n Запрос на продажу будет отправлен после подтверждения отпуска руководителем.',
						{ days: sellRequest.days, from: sellRequest.from, to: sellRequest.to }
					)
				),
				divider()
			);
		}

		return result;
	}
}
