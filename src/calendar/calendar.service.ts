import { Injectable } from '@nestjs/common';
import { NonWorkingDay, NonWorkingDayType } from '../lib/interfaces/calendar.interface';
import { ProdCalendarService } from '../database/service/production-calendar.service';
import { addDays, format_yyyy_mm_dd } from '../lib/functions';

import { NonWorkingDay as HelperNonWorkingDay } from '../main/helper.interface';
import { ProductionCalendar } from '../database/entity/production-calendar.entity';
import { differenceInCalendarDays } from 'date-fns';

@Injectable()
export class CalendarService {
	constructor(private readonly prodCalendar: ProdCalendarService) {}
	/**
	 *
	 * @returns Returns today Date
	 */
	today() {
		return new Date();
	}

	public async prodCalendarCalculator(
		from: Date | string,
		days: string | number,
		type?: 'vac' | 'dayoff'
	): Promise<HelperNonWorkingDay> {
		const year = new Date(from).getFullYear();
		const { holidays, weekends } = await this.getCalendar(year);
		const result = {
			decision: true,
			reason: '',
			to: 0,
		};

		let fromDate: string = format_yyyy_mm_dd(from);
		if (type === 'vac') {
			holidays.map((day) => {
				if (day === fromDate) {
					result.to++;
					const tempFrom = addDays(new Date(from), 1);
					fromDate = format_yyyy_mm_dd(tempFrom);
				} else {
					for (let i = 1; i <= days; i++) {
						const date = addDays(new Date(fromDate), i);
						if (new Date(day).getTime() === date.getTime()) {
							result.to++;
						}
					}
				}
			});
		}

		if (type === 'dayoff') {
			weekends.map((day) => {
				if (day === fromDate) {
					result.decision = false;
					result.reason = 'Выбери другую дату начала отгула: это выходной день.';
				} else {
					for (let i = 1; i < days; i++) {
						const date = addDays(new Date(fromDate), i);

						if (new Date(day).getTime() === date.getTime()) {
							result.to++;
						}
					}
				}
			});

			holidays.map((day) => {
				if (day == fromDate) {
					result.decision = false;
					result.reason = 'Выбери другую дату начала отгула: это праздничный день.';
				} else {
					for (let i = 1; i <= days; i++) {
						const date = addDays(new Date(fromDate), i);

						if (new Date(day).getTime() === date.getTime()) {
							result.to++;
						}
					}
				}
			});
		}

		if (!type) {
			holidays.forEach((day) => {
				for (let i = 0; i <= days; i++) {
					const date = addDays(new Date(fromDate), i);
					if (new Date(day).getTime() === date.getTime()) {
						result.to++;
					}
				}
			});
		}

		return result;
	}

	/**
	 *
	 * @param year
	 * @returns
	 */
	public async getCalendar(year?: number | string) {
		const prodCalendar = await this.prodCalendar.getCalendar(year);
		const holidays: string[] = [];
		const weekends: string[] = [];

		prodCalendar.forEach((calendar) => {
			const nonWorkingDays = JSON.parse(calendar.nonWorkingDays);
			if (!nonWorkingDays) return;

			nonWorkingDays.forEach((day: NonWorkingDay) => {
				if (day.status === NonWorkingDayType.WEEKEND) {
					weekends.push(day.date);
				} else {
					holidays.push(day.date);
				}
			});
		});

		return { holidays, weekends };
	}

	/**
	 * Get number of working days until given date
	 * @param needDate
	 */
	async getWorkDays(needDate: Date | number | string) {
		const date = new Date(needDate);
		const { holidays, weekends } = await this.getCalendar();
		const nonWorkingDays = holidays.concat(weekends);
		const datesToReq: number[] = [];
		const today = new Date(this.today().setHours(6, 0, 0, 0));

		const differenceBetweenDates = differenceInCalendarDays(date, today);
		for (let index = 0; index <= differenceBetweenDates; index++) {
			if (this.today() < today && index === 1) {
				datesToReq.push(today.getTime());
			} else {
				const date = addDays(today, index);
				datesToReq.push(date.getTime());
			}
		}

		const workDays = datesToReq.filter((timestamp) => {
			return !nonWorkingDays.includes(format_yyyy_mm_dd(new Date(timestamp)));
		});

		return workDays.length;
	}

	/**
	 *
	 * @param days
	 * @returns
	 */
	async getWorkDate(days) {
		const year = this.today().getFullYear();
		const { holidays, weekends } = await this.getCalendar(year);
		const nonWorkingDays = holidays.concat(weekends);
		let date = new Date(this.today().setHours(6, 0, 0, 0));
		if (this.today() > new Date(this.today().setHours(6, 0, 0, 0))) {
			date = addDays(date, 1);
		}

		const reqDays = days;
		let workDays = 0;

		for (let i = 0; i < days; i++) {
			if (nonWorkingDays.includes(format_yyyy_mm_dd(date))) {
				days++;
			} else {
				if (workDays === reqDays - 1) break;
				workDays++;
			}
			date = addDays(date, 1);
		}
		return date;
	}

	/**
	 * Check is year configured (active)
	 * @param year
	 * @returns true | false
	 */
	async isYearConfigured(year: number | string): Promise<boolean> {
		const record = await this.getConfiguredYear(year);
		return !!record;
	}

	/**
	 * Returns first active production calendar for given year or undefined
	 * @param year
	 */
	async getConfiguredYear(year: number | string): Promise<ProductionCalendar> {
		const calendars = await this.prodCalendar.getCalendar(year);
		if (calendars.length) return calendars[0];
		return undefined;
	}
}
