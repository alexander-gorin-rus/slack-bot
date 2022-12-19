/* eslint-disable no-console */
import { Test, TestingModule } from '@nestjs/testing';
import {
	ProdCalendarService,
	ProdCalendarTestService,
} from '../database/service/production-calendar.service';
import { format_yyyy_mm_dd } from '../lib/functions';
import { NonWorkingDay } from '../main/helper.interface';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
	let service: CalendarService;

	const setToday = (date: Date) => jest.spyOn(service, 'today').mockImplementation(() => date);

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CalendarService,
				{ provide: ProdCalendarService, useClass: ProdCalendarTestService },
			],
		}).compile();

		service = module.get<CalendarService>(CalendarService);
	});

	it('service', () => {
		expect(service).toBeDefined();
	});

	it('today', () => {
		expect(service.today()).toBeDefined();
	});

	it('active year', async () => {
		expect(await service.isYearConfigured(2022)).toBeTruthy();
		expect(await service.isYearConfigured(2023)).toBeFalsy();
	});

	it('today overload', () => {
		const today = new Date('2022-02-26');
		setToday(today);
		expect(service.today()).toEqual(today);
	});

	it('getWorkDays', async () => {
		const tests = [
			{ today: new Date('2022-10-24'), endDate: new Date('2022-10-28'), expect: 3 },
			{ today: new Date('2022-10-20'), endDate: new Date('2022-10-25'), expect: 2 },
			{ today: new Date('2022-10-10'), endDate: new Date('2022-10-26'), expect: 11 },
		];

		for (const test of tests) {
			setToday(test.today);
			const workdays = await service.getWorkDays(test.endDate);
			expect(workdays).toEqual(test.expect);
		}
	});

	it('getWorkDate', async () => {
		const tests = [
			{ today: new Date('2022-10-24'), days: 2, expect: '2022-10-25' },
			{ today: new Date('2022-10-20'), days: 2, expect: '2022-10-21' },
			{ today: new Date('2022-10-10'), days: 2, expect: '2022-10-11' },
		];

		for (const test of tests) {
			setToday(test.today);
			const date = await service.getWorkDate(test.days);
			expect(format_yyyy_mm_dd(date)).toEqual(test.expect);
		}
	});

	it('prodCalendarCalculator', async () => {
		const tests = [
			// нельзя брать отгул с выходного дня
			{
				from: new Date('2022-10-22'),
				days: 1,
				type: 'dayoff',
				check: (result: NonWorkingDay) => expect(result.decision).toBeFalsy(),
			},
			// можно брать отпуск с выходного дня
			{
				from: new Date('2022-10-22'),
				days: 1,
				type: 'vac',
				check: (result: NonWorkingDay) => expect(result.decision).toBeTruthy(),
			},
			// отпуск с отрицательными днями -- 0 дней
			{
				from: new Date('2022-10-22'),
				days: -1,
				type: 'vac',
				check: (result: NonWorkingDay) => expect(result.to).toEqual(0),
			},
		];

		for (const test of tests) {
			const result = await service.prodCalendarCalculator(
				test.from,
				test.days,
				test.type as 'vac' | 'dayoff'
			);
			test.check(result);
		}
	});
});
