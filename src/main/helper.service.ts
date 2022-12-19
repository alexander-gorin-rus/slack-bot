import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isString } from 'util';
import { Employee } from '../database/entity/employee.entity';
import { ProductionCalendar } from '../database/entity/production-calendar.entity';
import { EmployeeService } from '../database/service/employee.service';
import { ProdCalendarService } from '../database/service/production-calendar.service';
import { NonWorkingDay } from './helper.interface';
import { STATUS_WEEKEND } from '../configs/settings';
import { addDays, isSameDay } from 'date-fns';
import { messageFormat } from '../utils';

type GeneralRequest = { employee: Employee; confirms: { manager: Employee }[] };
type NonWorkingDayParam = 'vacation' | 'dayoff' | 'unknown';
@Injectable()
export class HelperService {
	constructor(private calendar: ProdCalendarService, private employeeService: EmployeeService) {}

	/**
	 * Use wordForm from lib/functions
	 * @deprecated
	 */
	public wordForm(n: number, text_forms: string[]): string {
		n = Math.abs(n) % 100;
		const n1 = n % 10;
		if (n > 10 && n < 20) {
			return text_forms[2];
		}
		if (n1 > 1 && n1 < 5) {
			return text_forms[1];
		}
		if (n1 == 1) {
			return text_forms[0];
		}

		return text_forms[2];
	}

	/**
	 * Use round from lib/functions
	 * @deprecated
	 */
	round(num: number, breakpoint = 95): number {
		if (Math.abs((num * 100) % 100) > breakpoint) {
			return num >= 0 ? Math.ceil(num) : Math.floor(num);
		} else {
			const result = num >= 0 ? Math.floor(num) : Math.ceil(num);
			return Math.abs(result) === 0 ? 0 : result;
		}
	}

	public boolToRus(value: boolean): 'Да' | 'Нет' {
		return value ? 'Да' : 'Нет';
	}

	/**
	 * Use convertDate from lib/functions
	 * @deprecated
	 */
	public convertDate(date: string | Date | number): string {
		return messageFormat('{date, date, long}', { date: new Date(date) });
	}

	public mailDateFormatFromDefault({
		date,
		day = '2-digit',
		month = 'long',
		year = 'numeric',
	}: {
		date: Date;
		day?: '2-digit' | 'numeric';
		month?: '2-digit' | 'numeric' | 'long' | 'short' | 'narrow';
		year?: '2-digit' | 'numeric';
	}) {
		return date.toLocaleDateString('ru-ru', { day: day, month, year });
	}

	public dateRecover(recDate: string): { date: string; days: string } {
		const vacDate = recDate.split(' ');
		const days = vacDate[2];
		const month = vacDate[6];
		const arr = [
			'января',
			'февраля',
			'марта',
			'апреля',
			'мая',
			'июня',
			'июля',
			'августа',
			'сентября',
			'октября',
			'ноября',
			'декабря',
		];
		let mm: string;
		for (let i = 0; i < arr.length; i++) {
			if (arr[i] == month) {
				mm = String(i + 1);
			}
		}
		if (Number(mm) < 10) {
			mm = '0' + mm;
		}
		const date = vacDate[7] + '-' + mm + '-' + vacDate[5];

		return { date, days };
	}

	private prepareProdCalendarData(calendars: ProductionCalendar[]) {
		const holidays = [];
		const weekends = [];

		calendars.map((calendar) => {
			JSON.parse(calendar.nonWorkingDays)?.map((day) => {
				if (day.status === STATUS_WEEKEND) {
					weekends.push(day.date);
				} else {
					holidays.push(day.date);
				}
			});
		});

		return { holidays, weekends };
	}

	public async getCalendar(year?: number | string) {
		const calendars = await this.calendar.getCalendar(year);
		return this.prepareProdCalendarData(calendars);
	}

	/**
	 * Use CalendarService.getWorkDays
	 * @deprecated
	 */
	public async getWorkDays(needDate) {
		const year = new Date(needDate).getFullYear();
		const { holidays, weekends } = await this.getCalendar(year);
		const nonWorkingDays = holidays.concat(weekends);
		const datesToReq = [];
		const today = new Date(new Date().setHours(6, 0, 0, 0));

		if (new Date().getTime() < today.getTime()) {
			datesToReq.push(today.getTime());
		}

		while (today < new Date(new Date(needDate).setDate(new Date(needDate).getDate() - 1))) {
			today.setDate(today.getDate() + 1);
			datesToReq.push(today.getTime());
		}

		const workDays = datesToReq.filter((item) => {
			return !nonWorkingDays.includes(new Date(item).toJSON().substring(0, 10));
		});

		return workDays.length;
	}

	/**
	 * Count non working days until given `days` working days from `startDate` achieved
	 *
	 * `nonWorkingDayType`:
	 *  * `vacation` and `unknown`: only holidays matter
	 *  * `dayoff`: holidays and weekends matter
	 */
	private async countVacationDays(
		startDate: Date,
		days: number,
		nonWorkingDayType: 'vacation' | 'dayoff' | 'unknown'
	): Promise<number> {
		const { holidays, weekends } = await this.getCalendar();

		// helper functions
		const weekendsDates = weekends.map((weekend) => new Date(weekend));
		const holidaysDates = holidays.map((holiday) => new Date(holiday));
		const isWeekend = (day: Date) => weekendsDates.some((weekend) => isSameDay(day, weekend));
		const isHoliday = (day: Date) => holidaysDates.some((holiday) => isSameDay(day, holiday));
		const isNonWorkingDay = (day: Date) => isWeekend(day) || isHoliday(day);

		const checkFn = nonWorkingDayType === 'dayoff' ? isNonWorkingDay : isHoliday;

		if (nonWorkingDayType === 'dayoff' && isNonWorkingDay(startDate)) {
			const dayType = isWeekend(startDate) ? 'выходной' : 'праздничный';
			const reason = `Выбери другую дату начала отгула: это ${dayType} день.`;
			throw new Error(reason);
		}
		const daysCounter = { nonWorkingDay: 0, workingDay: 0 };
		let day = startDate;
		// '<=' важно, при '<' учитываются лишние выходные, если конец периода попадает на пт
		while (daysCounter.workingDay <= days - 1) {
			if (checkFn(day)) {
				daysCounter.nonWorkingDay++;
			} else {
				daysCounter.workingDay++;
			}
			if (daysCounter.workingDay > 370) throw new Error('Слишком большое число итераций');
			day = addDays(day, 1);
		}
		return daysCounter.nonWorkingDay;
	}

	public async startDateCalculation(
		startDate: string | Date,
		index = 0
	): Promise<{ from: Date; offset: number }> {
		const { holidays } = await this.getCalendar();
		const holidaysDates = holidays.map((holiday) => new Date(holiday));
		const isHoliday = (day: Date) => holidaysDates.some((holiday) => isSameDay(day, holiday));
		const tempDate = new Date(startDate);
		tempDate.setDate(tempDate.getDate() + index);
		if (!isHoliday(tempDate))
			return {
				from: tempDate,
				offset: index,
			};
		else {
			index++;
			return await this.startDateCalculation(startDate, index);
		}
	}

	public async prodCalendarCalculator(
		from: Date | string,
		days: number,
		type?: 'vac' | 'dayoff'
	): Promise<NonWorkingDay> {
		const result = {
			decision: true,
			reason: '',
			to: 0,
		};

		let countType: NonWorkingDayParam;
		if (type === 'vac') countType = 'vacation';
		if (type === 'dayoff') countType = 'dayoff';
		if (!type) countType = 'unknown';

		try {
			result.to = await this.countVacationDays(new Date(from), days, countType);
			return result;
		} catch (err) {
			result.decision = false;
			result.to = 0;
			if (err instanceof Error) {
				result.reason = err.message;
			} else {
				result.reason = 'Что-то пошло не так...';
			}
			return result;
		}
	}

	formateDate(date: Date | string): string {
		let result: string;
		if (!isString(date)) {
			result = date.toJSON().substring(0, 10);
		} else {
			result = date.substring(0, 10);
		}
		return result;
	}

	addAnotherDays(days) {
		if (days == 1 || days == 7 || days == 8 || days == 14) {
			return 0;
		} else if (days == 4 || days == 5 || days == 11 || days == 12) {
			return 2;
		} else {
			return 1;
		}
	}

	checkStartDate(date, dates) {
		if (
			dates.some(
				(el: { date: string; status: number }) =>
					String(new Date(el.date)) == String(new Date(date))
			)
		) {
			return this.checkStartDate(
				new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
				dates
			);
		} else {
			return date;
		}
	}

	/**
	 * Use CalendarService.getWorkDate
	 * @deprecated
	 */
	async getWorkDate(days) {
		const year = new Date().getFullYear();
		const { holidays, weekends } = await this.getCalendar(year);
		const nonWorkingDays = holidays.concat(weekends);
		const date = new Date(new Date().setHours(6, 0, 0, 0));
		if (new Date() > new Date(new Date().setHours(6, 0, 0, 0))) {
			date.setDate(date.getDate() + 1);
		}

		const reqDays = days;
		let workDays = 0;

		for (let i = 0; i < days; i++) {
			if (nonWorkingDays.includes(date.toJSON().substring(0, 10))) {
				days++;
			} else {
				if (workDays == reqDays - 1) break;
				workDays++;
			}
			date.setDate(date.getDate() + 1);
		}

		return date;
	}

	@Cron('0 3 1 7 *')
	async setCalendar() {
		const year = new Date().getFullYear() + 1;
		const calendar = await this.calendar.getByYear(year);
		if (!(calendar.length && calendar)) {
			const weekends = [];
			const nextYear = new Date(new Date().setFullYear(year, 0, 1));
			while (nextYear.getFullYear() < year + 1) {
				if (nextYear.getDay() == 6 || nextYear.getDay() == 0) {
					weekends.push({
						status: 1,
						date: `${nextYear.toJSON().substring(0, 10)}`,
					});
				}
				nextYear.setDate(nextYear.getDate() + 1);
			}
			const prodCalendar = {
				year: String(year),
				nonWorkingDays: JSON.stringify(weekends),
				active: false,
			} as ProductionCalendar;
			await this.calendar.save(prodCalendar);
		}
	}

	private async recursiveWalker(
		employee: Employee,
		filterFunction: (employee: Employee) => boolean
	): Promise<Employee> {
		if (!employee) return null;
		if (filterFunction(employee)) return employee;
		const headEmployee = await this.employeeService.findOne(employee.headId);
		return await this.recursiveWalker(headEmployee, filterFunction);
	}

	async getLprRecursively(employee: Employee) {
		return await this.recursiveWalker(employee, (employee) => employee.isLPR);
	}

	async getChiefRecursively(employee: Employee) {
		return await this.recursiveWalker(employee, (employee) =>
			employee.position.name.includes('CHIEF')
		);
	}

	monthDiff(dateFrom: Date, dateTo: Date) {
		return (
			dateTo.getMonth() - dateFrom.getMonth() + 12 * (dateTo.getFullYear() - dateFrom.getFullYear())
		);
	}

	dayDiff(dateFrom: Date, dateTo: Date) {
		return Math.ceil(Math.abs(dateTo.getTime() - dateFrom.getTime()) / (1000 * 3600 * 24)) - 1;
	}

	yearDiff(dateFrom: Date, dateTo: Date) {
		let diff = (dateFrom.getTime() - dateTo.getTime()) / 1000;
		diff = diff / (60 * 60 * 24);

		return Math.abs(Math.round(diff / 365.25));
	}

	dateDiff(dateFrom: Date, dateTo: Date) {
		const startYear = dateFrom.getFullYear();
		const startMonth = dateFrom.getMonth();
		const startDay = dateFrom.getDate();

		const endYear = dateTo.getFullYear();
		const endMonth = dateTo.getMonth();
		const endDay = dateTo.getDate();

		// We calculate February based on end year as it might be a leep year which might influence the number of days.
		const february = (endYear % 4 == 0 && endYear % 100 != 0) || endYear % 400 == 0 ? 29 : 28;
		const daysOfMonth = [31, february, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

		const startDateNotPassedInEndYear =
			endMonth < startMonth || (endMonth == startMonth && endDay < startDay);
		const years = endYear - startYear - (startDateNotPassedInEndYear ? 1 : 0);

		const months = (12 + endMonth - startMonth - (endDay < startDay ? 1 : 0)) % 12;

		// (12 + ...) % 12 makes sure index is always between 0 and 11
		const days =
			startDay <= endDay
				? endDay - startDay
				: daysOfMonth[(12 + endMonth - 1) % 12] - startDay + endDay;

		return {
			years: years,
			months: months,
			days: days,
		};
	}

	groupBy = function <T>(arr: T[], key: string) {
		return arr.reduce((prevValue, currentValue) => {
			(prevValue[currentValue[key]] = prevValue[currentValue[key]] || []).push(currentValue);
			return prevValue;
		}, {});
	};

	addMonths(date: Date, n: number) {
		return new Date(date.setMonth(date.getMonth() + n));
	}

	/**
	 * Get list of slackIds for posting message. It contains all request's PMs and optionally LPR
	 * @param request
	 * @param shouldNofifyLPR Should we add LPR to output list
	 */
	async getPMandLPRNotificationSlackIds<T extends GeneralRequest>(
		request: T,
		shouldNofifyLPR: boolean
	) {
		const slackIdsToNotify = request.confirms.map((confirm) => confirm.manager.slackId); // PMs
		if (shouldNofifyLPR) {
			const employeeLPR = await this.getLprRecursively(request.employee.head);
			const employeeHeadSlackId = employeeLPR?.slackId;
			if (employeeHeadSlackId) slackIdsToNotify.push(employeeHeadSlackId);
		}
		return slackIdsToNotify;
	}
}
