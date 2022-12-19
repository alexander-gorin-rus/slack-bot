import { Injectable } from '@nestjs/common';
import { VacationPlanInterface } from './vacation-plan.interface';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { Employee } from '../../database/entity/employee.entity';
import { SellRequestService } from '../../database/service/sell.service';
import { isPMSelectionValid, messageFormat } from '../../utils';
import { addDays } from '../../lib/functions/calendar';
import { CalendarService } from '../../calendar/calendar.service';

function prepareErrorMessage(
	crossData: {
		type: 'отгул' | 'отпуск' | 'продажу';
		status: 'completed' | 'await';
		warnings: { from: Date | string; to: Date | string }[];
	}[]
) {
	const formatted = crossData.map((cross) => ({
		status: cross.status,
		items: cross.warnings.map((item) =>
			messageFormat('{type} c {from, date, short} по {to, date, short}', {
				type: cross.type,
				from: new Date(item.from),
				to: new Date(item.to),
			})
		),
	}));

	const reduce = <T>(list: T[], item: T) => list.concat(item);
	return {
		completed: formatted
			.filter((e) => e.status === 'completed' && e.items.length)
			.map((e) => e.items)
			.reduce(reduce, []),
		await: formatted
			.filter((e) => e.status === 'await' && e.items.length)
			.map((e) => e.items)
			.reduce(reduce, []),
	};
}

const POSTFIX = 'Выбери другой день начала отпуска.';
const MIN_DAYS_FOR_VACATION = 4;

function getError(
	prefix: string,
	postfix: string,
	items: { from: Date | string; to: Date | string }[]
) {
	const dates = items
		.map((item) => messageFormat('с {from, date, long} по {to, date, long}', item))
		.join(', ');

	return `${prefix} ${dates} ${postfix}`;
}

@Injectable()
export class HardValidatorService {
	constructor(
		private vacationRequestService: VacationRequestService,
		private dayoffRequestService: DayoffRequestService,
		private sellRequestService: SellRequestService,
		private calendar: CalendarService
	) {}

	async validate(
		{ date, days, pmSlackIds }: VacationPlanInterface,
		employee: Employee,
		daysToAdd: number
	): Promise<null | Record<string, string>> {
		if (!isPMSelectionValid(pmSlackIds))
			// it's forbidden to select nonPm and some other PM
			return { multiUserSelect: 'Выбраны несовместимые значения' };
		const workDaysToRequest = await this.calendar.getWorkDays(date);
		const to = addDays(date, Number(days) - 1 + daysToAdd);
		const beforeTo = addDays(date, Number(days) - 1 + daysToAdd - 2);

		try {
			await this.checkStartDate(workDaysToRequest);

			await this.checkOverlappingDayoff(employee, new Date(date), to, 'completed');
			await this.checkOverlappingDayoff(employee, new Date(date), to, 'await');

			const overlappingSell = await this.checkOverlappingSell(
				employee,
				new Date(date),
				to,
				beforeTo
			);

			await this.checkOverlappingVacation(employee, new Date(date), to, 'completed');
			await this.checkOverlappingVacation(employee, new Date(date), to, 'await');
			if (overlappingSell) return overlappingSell;
			return null;
		} catch (validationError) {
			if (validationError instanceof Error) return { date: validationError.message };
			return { date: 'Неизвестная ошибка' };
		}
	}

	async checkStartDate(daysToRequest: number, ndays = 5) {
		const workDate = await this.calendar.getWorkDate(ndays);
		const template = `Планирование отпуска возможно не позднее, чем за ${MIN_DAYS_FOR_VACATION} рабочих дней. Выбери дату начала отпуска не ранее, чем {workDate, date, long}`;
		if (daysToRequest < MIN_DAYS_FOR_VACATION)
			throw new Error(messageFormat(template, { workDate }));
	}

	async checkOverlappingDayoff(
		employee: Employee,
		date: Date,
		to: Date,
		status: 'await' | 'completed'
	) {
		const overlapList = await this.dayoffRequestService.findCrossingRequest(
			employee,
			new Date(date),
			to,
			status
		);
		const hasOverlap = overlapList.length !== 0;
		const errorText =
			status === 'completed' ? 'У тебя уже назначен отгул' : 'Ты уже планируешь отгул';

		if (hasOverlap) throw new Error(getError(errorText, POSTFIX, overlapList));
	}

	async checkOverlappingVacation(
		employee: Employee,
		date: Date,
		to: Date,
		status: 'await' | 'completed'
	) {
		const overlapList = await this.vacationRequestService.findCrossingRequest(
			employee,
			new Date(date),
			to,
			status
		);
		const hasOverlap = overlapList.length !== 0;
		const errorText =
			status === 'completed' ? 'У тебя уже назначен отпуск' : 'Ты уже планируешь отпуск';
		if (hasOverlap) throw new Error(getError(errorText, POSTFIX, overlapList));
	}

	async checkOverlappingSell(employee: Employee, date: Date, to: Date, beforeTo: Date) {
		const overlappingSellList = await this.sellRequestService.findCrossingRequest(
			employee,
			new Date(date),
			to
		);
		const overlappingSellListBefore = await this.sellRequestService.findCrossingRequest(
			employee,
			new Date(date),
			beforeTo
		);

		const overlappingVacationList = await this.vacationRequestService.findCrossingRequest(
			employee,
			new Date(date),
			to,
			'completed'
		);

		const crossingVacationList = await this.vacationRequestService.findCrossingRequest(
			employee,
			new Date(date),
			to,
			'await'
		);

		const hasWarnings =
			crossingVacationList.length ||
			overlappingVacationList.length ||
			overlappingSellList.length ||
			overlappingSellListBefore.length;

		if (!hasWarnings) return null;

		const warningDetailed = prepareErrorMessage([
			{ type: 'отпуск', status: 'await', warnings: crossingVacationList },
			{ type: 'отпуск', status: 'completed', warnings: overlappingVacationList },
			{ type: 'продажу', status: 'await', warnings: overlappingSellList },
		]);

		const completedWarning = warningDetailed.completed.length
			? ` Tы идешь: ${warningDetailed.completed.join(', ')}.`
			: '';
		const awaitWarning = warningDetailed.await.length
			? ` Ты уже планируешь: ${warningDetailed.await.join(', ')}.`
			: '';
		return {
			date: `Некоторые даты пересекаются!${completedWarning}${awaitWarning} Выбери другой день начала отпуска.`,
		};
	}
}
