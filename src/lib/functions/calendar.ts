/* eslint-disable @typescript-eslint/no-namespace */
import { addDays as df_addDays, subDays as df_subDays, format as df_format } from 'date-fns';

const MONTH_LIST = [
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

/**
 * Get date after `days` days
 * @param date Input date
 * @param days Days to add
 * @returns Input date + `days` days
 */
export function addDays(date: number | string | Date, days: number | string): Date {
	return df_addDays(new Date(date), Number(days));
}

/**
 * Get date before `days` days
 * @param date Input date
 * @param days Days to substract
 * @returns Input date - `days` days
 */
export function subDays(date: number | string | Date, days: number | string): Date {
	return df_subDays(new Date(date), Number(days));
}

/**
 * Format date
 * @param date Input Date
 * @param dateFormat date-fns date format
 * @returns formatted date
 */
export function format(date: Date | number | string, dateFormat: string) {
	return df_format(new Date(date), dateFormat);
}

/**
 * Format date as DD-MM-YYYY
 * @param date Input date
 * @returns date in yyyy-mm-dd format
 */
export function format_yyyy_mm_dd(date: Date | number | string) {
	return format(date, 'yyyy-MM-dd');
}

/**
 * What this function do?
 * @param days
 * @returns
 */
export function addAnotherDays(days: number) {
	if ([1, 7, 8, 14].includes(days)) return 0;
	if ([4, 5, 11, 12].includes(days)) return 2;
	return 1;
}

export function convertDate(date: string | Date | number): string {
	const vacDate = new Date(date);
	const year = vacDate.getFullYear();
	const month = vacDate.getMonth();
	const day = vacDate.getDate();
	const monthString = MONTH_LIST[month];
	return `${day} ${monthString} ${year} года`;
}
