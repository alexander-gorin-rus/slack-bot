import { Test, TestingModule } from '@nestjs/testing';
import { HelperService } from './helper.service';
import { ProdCalendarService } from '../database/service/production-calendar.service';
import { EmployeeService } from '../database/service/employee.service';

describe('HelperService', () => {
	let service: HelperService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				HelperService,
				{
					provide: ProdCalendarService,
					useValue: {},
				},
				{
					provide: EmployeeService,
					useValue: {},
				},
			],
		}).compile();

		service = module.get<HelperService>(HelperService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('magick round', () => {
		expect(service.round(4.66)).toEqual(4);
		expect(service.round(4.96)).toEqual(5);
		expect(service.round(-4.66)).toEqual(-4);
		expect(service.round(-4.96)).toEqual(-5);
		expect(service.round(-0.01)).toEqual(0);
	});
});
