import { Injectable } from '@nestjs/common';
import { HelperService } from '../../main/helper.service';
import { Messages } from '../../main/messages.service';
import { DayoffRequest } from '../../database/entity/dayoff-request.entity';
import { mkdown } from '../../templates/mkdown';
import { divider } from '../../templates/divider';

@Injectable()
export class DayoffPlanService {
	constructor(private helperService: HelperService, private messages: Messages) {}

	plannedDayoffMessage(slackId: string, request: DayoffRequest) {
		const result = {
			text: 'Планирование отгула',
			channel: slackId,
			blocks: [
				mkdown(
					this.messages(
						'Я отправил запрос на отгул на {days} {days, plural, one {день} few {дня} many {дней} other {}}' +
							' c {from, date, long} по {to, date, long}',
						{ days: request.days, from: request.from, to: request.to }
					)
				),
				divider(),
			],
		};

		return result;
	}
}
