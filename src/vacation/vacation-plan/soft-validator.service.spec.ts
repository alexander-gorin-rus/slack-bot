/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { MINIMAL_START_DATE, SoftValidatorService } from './soft-validator.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { CalendarService } from '../../calendar/calendar.service';
import { Messages } from '../../main/messages.service';
import { SellRequestService } from '../../database/service/sell.service';
import { messageFormat } from '../../utils';
import { Employee } from '../../database/entity/employee.entity';
import { VacationPlanInterface } from './vacation-plan.interface';
import { SellRequest } from '../../database/entity/sell.entity';
import {
	ProdCalendarService,
	ProdCalendarTestService,
} from '../../database/service/production-calendar.service';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { validate } from 'class-validator';
import { addDays, format_yyyy_mm_dd } from '../../lib/functions';

describe('SoftValidatorService', () => {
	let service: SoftValidatorService;
	let calendarService: CalendarService;

	const setToday = (date: Date) =>
		jest.spyOn(calendarService, 'today').mockImplementation(() => date);

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SoftValidatorService,
				{ provide: ProdCalendarService, useClass: ProdCalendarTestService },
				CalendarService,
				{ provide: Messages, useValue: (text: string, data: any) => messageFormat(text, data) },
				{
					provide: VacationRequestService,
					useValue: {
						findNearRequests: async (
							employee: Employee,
							from: Date,
							to: Date
						): Promise<VacationRequest[]> => await [],
					},
				},
				{
					provide: SellRequestService,
					useValue: {
						findCrossingRequest: async (
							employee: Employee,
							from: Date,
							to: Date
						): Promise<SellRequest[]> => await [],
					},
				},
			],
		}).compile();

		service = module.get<SoftValidatorService>(SoftValidatorService);
		calendarService = module.get<CalendarService>(CalendarService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('validate: vacation length', async () => {
		const user = new Employee();
		user.days = 10;
		const validateResult = await service.validate(
			{ days: '15', date: '' } as VacationPlanInterface,
			user
		);
		expect(validateResult).toContain(
			':exclamation: Продолжительность запрашиваемого отпуска превышает число доступных тебе дней отпуска на данный момент.'
		);
	});

	it('validate: sells', async () => {
		const user = new Employee();
		user.days = 20;
		const validateResult = await service.validate(
			{ days: '15', date: '2022-10-10' } as VacationPlanInterface,
			user,
			11,
			0
		);
		expect(validateResult).toContain(
			// eslint-disable-next-line max-len
			':warning: Ты берешь отпуск, некратный неделе. Чтобы компенсировать выходные дни, с твоего счета отпускных дней будет продано дополнительно: 11.\nДата окончания отпуска - 24 октября 2022 г.'
		);
	});

	it('validate: holidays without sells', async () => {
		const user = new Employee();
		user.days = 20;
		const validateResult = await service.validate(
			{ days: '15', date: '2022-10-10' } as VacationPlanInterface,
			user,
			0,
			5
		);
		expect(validateResult).toContain(
			':exclamation: Во время планируемого отпуска будут праздники, поэтому дата окончания отпуска будет увеличена до 29 октября 2022 года'
		);
	});

	it('validate: holidays with sells', async () => {
		const user = new Employee();
		user.days = 20;
		const validateResult = await service.validate(
			{ days: '15', date: '2022-10-10' } as VacationPlanInterface,
			user,
			3,
			5
		);
		expect(validateResult).toContain(
			':exclamation: Во время планируемого отпуска будут праздники, поэтому дата окончания отпуска будет увеличена до 1 ноября 2022 года'
		);
	});

	it('validate: minimal start date', async () => {
		const today = new Date('2022-10-26');
		setToday(today);
		const user = new Employee();
		user.days = 20;
		const tests = [
			{ start: MINIMAL_START_DATE - 1, expect: true },
			{ start: MINIMAL_START_DATE, expect: false },
			{ start: MINIMAL_START_DATE + 1, expect: false },
		];
		for (const test of tests) {
			const validateResult = await service.validate(
				{
					days: '15',
					date: format_yyyy_mm_dd(addDays(today, test.start)),
				} as VacationPlanInterface,
				user,
				3,
				5
			);
			const checkResult = validateResult.some(
				(item) =>
					item ===
					':exclamation: До начала отпуска осталось менее полутора месяцев. Это может вызвать трудности при согласовании.'
			);
			expect(checkResult).toEqual(test.expect);
		}
	});
});
