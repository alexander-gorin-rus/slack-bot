import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from '../../calendar/calendar.service';
import { CalculationController } from './calculation.controller';
import {
	ProdCalendarService,
	ProdCalendarTestService,
} from '../../database/service/production-calendar.service';
import { Employee } from '../../database/entity/employee.entity';
import { VacationDayChangeService } from '../../database/service/vacation-day-change.service';
import { KafkaService } from '../../kafka/kafka.service';
import { EmployeeService } from '../../database/service/employee.service';

describe('CalculationController', () => {
	let calendar: CalendarService;
	let service: CalculationController;

	const setToday = (date: Date) => jest.spyOn(calendar, 'today').mockImplementation(() => date);

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [CalculationController],
			providers: [
				CalendarService,
				{
					provide: ProdCalendarService,
					useClass: ProdCalendarTestService,
				},
				{ provide: KafkaService, useValue: {} },
				{
					provide: VacationDayChangeService,
					useValue: {
						save: (obj) => obj,
					},
				},
				{ provide: EmployeeService, useValue: {} },
			],
		}).compile();

		service = module.get<CalculationController>(CalculationController);
		calendar = module.get<CalendarService>(CalendarService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('createVacationDayChange', async () => {
		const today = new Date('2022-10-28');
		setToday(today);
		const user = new Employee();
		user.vacationDaysPerMonth = 2.33;
		const change = await service.createVacationDayChange(user);

		expect(change.days).toEqual(user.vacationDaysPerMonth);
		expect(change.employee).toEqual(user);
	});
});
