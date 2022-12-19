import { Injectable } from '@nestjs/common';
import { set } from 'date-fns';
import { Employee } from '../../database/entity/employee.entity';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { SellRequestService } from '../../database/service/sell.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { addDays } from '../../lib/functions';
import { HelperService } from '../../main/helper.service';
import { Messages } from '../../main/messages.service';
import { messageFormat } from '../../utils';
import { isPMSelectionValid } from '../../utils';
import { DayoffPlanInterface } from './dayoff-plan.interface';

export function isEarlyToday16PM(date: Date) {
	const now = new Date();
	const requestedDateTime = set(date, {
		hours: now.getUTCHours(),
		minutes: now.getUTCMinutes(),
		seconds: now.getUTCSeconds(),
	});
	const minAllowedDayoffDate = set(now, { hours: 13, minutes: 0, seconds: 0 }); // 16PM MSK is 13 UTC
	return requestedDateTime.getTime() > minAllowedDayoffDate.getTime();
}

@Injectable()
export class HardValidatorService {
	constructor(
		private vacationRequestService: VacationRequestService,
		private dayoffRequestService: DayoffRequestService,
		private messages: Messages,
		private sellRequestService: SellRequestService,
		private helper: HelperService
	) {}

	async validate(
		{ date, days, reason, pmSlackIds }: DayoffPlanInterface,
		employee: Employee,
		daysToAdd: number
	): Promise<null | Record<string, string>> {
		if (!isPMSelectionValid(pmSlackIds))
			// it's forbidden to select nonPm and some other PM
			return { multiUserSelect: 'Выбраны несовместимые значения' };

		const emojiRegexp = /(\p{Emoji_Presentation}|\p{Extended_Pictographic}|:(\w+):)/giu;
		const urlRegexp =
			// eslint-disable-next-line no-useless-escape
			/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/gm;
		if (emojiRegexp.test(reason)) {
			return {
				reason:
					'Нельзя указывать смайлики и спецсимволы в качестве причины. Пожалуйста, напиши словами.',
			};
		}
		if (urlRegexp.test(reason)) {
			return {
				reason: 'Нельзя указывать ссылки в качестве причины. Пожалуйста, напиши словами.',
			};
		}
		if (reason.length > 150) {
			return {
				reason: 'Максимальная длина - 150 символов, опиши причину покороче.',
			};
		}
		if (isEarlyToday16PM(date)) {
			return {
				date: messageFormat(
					'Выбери дату начала отгула не ранее, чем {date, date, long} 16:00 MSK',
					{
						date: new Date(),
					}
				),
			};
		}

		const getErrorMessageObject = ({ introText, endText }, items) => {
			const dates = items
				.map((item) => this.messages('\nс {from, date, long} по {to, date, long}\n', item))
				.join(', ');

			return {
				date: `${introText} ${dates} ${endText}`,
			};
		};

		const to = addDays(date, Number(days) + daysToAdd);

		const overlappingDayoffList = await this.dayoffRequestService.findCrossingRequest(
			employee,
			date,
			to,
			'completed'
		);
		if (overlappingDayoffList.length > 0) {
			const errorMessageTextParts = {
				introText: 'У тебя уже назначен отгул',
				endText: 'Выбери другой день начала отгула.',
			};

			return getErrorMessageObject(errorMessageTextParts, overlappingDayoffList);
		}

		const crossingDayoffList = await this.dayoffRequestService.findCrossingRequest(
			employee,
			date,
			to,
			'await'
		);
		if (crossingDayoffList.length > 0) {
			const errorMessageTextParts = {
				introText: 'Ты уже планируешь отгул',
				endText: 'Выбери другой день начала отгула.',
			};

			return getErrorMessageObject(errorMessageTextParts, crossingDayoffList);
		}

		const overlappingVacationList = await this.vacationRequestService.findCrossingRequest(
			employee,
			date,
			to,
			'completed'
		);
		if (overlappingVacationList.length > 0) {
			const errorMessageTextParts = {
				introText: 'У тебя уже назначен отпуск',
				endText: 'Выбери другой день начала отгула.',
			};

			return getErrorMessageObject(errorMessageTextParts, overlappingVacationList);
		}

		const crossingVacationList = await this.vacationRequestService.findCrossingRequest(
			employee,
			date,
			to,
			'await'
		);
		if (crossingVacationList.length > 0) {
			const errorMessageTextParts = {
				introText: 'Ты уже планируешь отпуск',
				endText: 'Выбери другой день начала отгула.',
			};

			return getErrorMessageObject(errorMessageTextParts, crossingVacationList);
		}

		const workDaysToRequest = await this.helper.getWorkDays(date);
		const currentHour = new Date(date).getUTCHours();

		if (workDaysToRequest < 1 && currentHour >= 13) {
			const errorMessageTextParts = {
				introText:
					'Между текущей датой и датой начала отгула должно быть не менее 1 рабочего дня (до 16:00 по МСК).',
				endText: 'Выбери другой день начала отгула.',
			};

			return getErrorMessageObject(errorMessageTextParts, crossingVacationList);
		}

		return null;
	}
}
