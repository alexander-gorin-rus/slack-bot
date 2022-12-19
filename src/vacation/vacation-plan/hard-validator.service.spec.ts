import { Test, TestingModule } from '@nestjs/testing';
import { HardValidatorService } from './hard-validator.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { CalendarService } from '../../calendar/calendar.service';
import { Messages } from '../../main/messages.service';
import { SellRequestService } from '../../database/service/sell.service';
import { Employee } from '../../database/entity/employee.entity';
import { addDays, format_yyyy_mm_dd } from '../../lib/functions';
import { VacationPlanInterface } from './vacation-plan.interface';
import {
	ProdCalendarService,
	ProdCalendarTestService,
} from '../../database/service/production-calendar.service';
import { messageFormat } from '../../utils';
import { DayoffRequest } from '../../database/entity/dayoff-request.entity';

// eslint-disable-next-line require-await
async function dayoff_findCrossingRequest(
	employee: Employee,
	from: Date,
	to: Date,
	status: 'await' | 'completed'
): Promise<DayoffRequest[]> {
	const list =
		status === 'completed'
			? ([{ from: new Date('2022-11-20'), to: new Date('2022-11-30') }] as DayoffRequest[])
			: ([{ from: new Date('2022-12-20'), to: new Date('2022-12-30') }] as DayoffRequest[]);
	return list.filter(
		(elem) => (to < elem.to && to > elem.from) || (from > elem.from && from < elem.to)
	);
}

// eslint-disable-next-line require-await
async function vacation_findCrossingRequest(
	employee: Employee,
	from: Date,
	to: Date,
	status: 'await' | 'completed'
): Promise<DayoffRequest[]> {
	const list =
		status === 'completed'
			? ([{ from: new Date('2022-11-10'), to: new Date('2022-11-19') }] as DayoffRequest[])
			: ([{ from: new Date('2022-12-10'), to: new Date('2022-12-19') }] as DayoffRequest[]);
	return list.filter(
		(elem) => (to < elem.to && to > elem.from) || (from > elem.from && from < elem.to)
	);
}

// eslint-disable-next-line require-await
async function sell_findCrossingRequest(
	employee: Employee,
	from: Date,
	to: Date
): Promise<DayoffRequest[]> {
	const list = [{ from: new Date('2022-11-01'), to: new Date('2022-11-09') }] as DayoffRequest[];
	return list.filter(
		(elem) => (to < elem.to && to > elem.from) || (from > elem.from && from < elem.to)
	);
}

describe('HardValidatorService', () => {
	let service: HardValidatorService;
	let calendarService: CalendarService;
	let messages: Messages;

	const setToday = (date: Date) =>
		jest.spyOn(calendarService, 'today').mockImplementation(() => date);

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				HardValidatorService,
				{ provide: ProdCalendarService, useClass: ProdCalendarTestService },
				CalendarService,
				{
					provide: VacationRequestService,
					useValue: { findCrossingRequest: vacation_findCrossingRequest },
				},
				{
					provide: DayoffRequestService,
					useValue: { findCrossingRequest: dayoff_findCrossingRequest },
				},
				{
					provide: SellRequestService,
					useValue: { findCrossingRequest: sell_findCrossingRequest },
				},

				{ provide: Messages, useValue: (text: string, data: any) => messageFormat(text, data) },
			],
		}).compile();

		service = module.get<HardValidatorService>(HardValidatorService);
		calendarService = module.get<CalendarService>(CalendarService);
		messages = module.get<Messages>(Messages);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('validate: start vacation early 4 days', async () => {
		const days = [0, 1, 2, 3, 4];
		const today = new Date('2022-10-26');
		setToday(today);
		const allowedStartDate = await calendarService.getWorkDate(5);
		for (const vacationDays of days) {
			const result = await service.validate(
				{
					date: format_yyyy_mm_dd(addDays(today, vacationDays)),
					days: '4',
				} as VacationPlanInterface,
				new Employee(),
				5
			);
			expect(result.date).toContain(
				'Планирование отпуска возможно не позднее, чем за 4 рабочих дней.'
			);
			expect(result.date).toContain(messages('{date, date, long}', { date: allowedStartDate }));
		}
	});

	it('checkOverlappingDayoff: completed dayoff', async () => {
		const today = new Date('2022-09-26');
		setToday(today);
		const user = new Employee();
		user.days = 28;

		const result = await service.validate(
			{ days: '4', date: '2022-11-26' } as VacationPlanInterface,
			user,
			1
		);
		expect(result.date).toEqual(
			'У тебя уже назначен отгул с 20 ноября 2022 г. по 30 ноября 2022 г. Выбери другой день начала отпуска.'
		);
	});

	it('checkOverlappingDayoff: waiting dayoff', async () => {
		const today = new Date('2022-10-26');
		setToday(today);
		const user = new Employee();
		user.days = 28;

		const result = await service.validate(
			{ days: '4', date: '2022-12-26' } as VacationPlanInterface,
			user,
			1
		);
		expect(result.date).toEqual(
			'Ты уже планируешь отгул с 20 декабря 2022 г. по 30 декабря 2022 г. Выбери другой день начала отпуска.'
		);
	});

	it('checkOverlappingVacation: completed dayoff', async () => {
		const today = new Date('2022-09-26');
		setToday(today);
		const user = new Employee();
		user.days = 28;

		const result = await service.validate(
			{ days: '4', date: '2022-11-16' } as VacationPlanInterface,
			user,
			1
		);
		expect(result.date).toEqual(
			'У тебя уже назначен отпуск с 10 ноября 2022 г. по 19 ноября 2022 г. Выбери другой день начала отпуска.'
		);
	});

	it('checkOverlappingVacation: waiting dayoff', async () => {
		const today = new Date('2022-10-26');
		setToday(today);
		const user = new Employee();
		user.days = 28;

		const result = await service.validate(
			{ days: '4', date: '2022-12-16' } as VacationPlanInterface,
			user,
			1
		);
		expect(result.date).toEqual(
			'Ты уже планируешь отпуск с 10 декабря 2022 г. по 19 декабря 2022 г. Выбери другой день начала отпуска.'
		);
	});

	it('checkOverlappingSell', async () => {
		const today = new Date('2022-10-26');
		setToday(today);
		const user = new Employee();
		user.days = 28;

		const result = await service.validate(
			{ days: '4', date: '2022-11-06' } as VacationPlanInterface,
			user,
			1
		);
		expect(result.date).toEqual(
			'Некоторые даты пересекаются! Ты уже планируешь: продажу c 01.11.2022 по 09.11.2022. Выбери другой день начала отпуска.'
		);
	});

	it('OK case', async () => {
		const today = new Date('2022-09-26');
		setToday(today);
		const user = new Employee();
		user.days = 28;

		const result = await service.validate(
			{ days: '4', date: '2022-10-16' } as VacationPlanInterface,
			user,
			1
		);
		expect(result).toEqual(null);
	});
});
