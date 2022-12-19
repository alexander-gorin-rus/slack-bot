import { Test, TestingModule } from '@nestjs/testing';
import { VacationDayChangeService } from './vacation-day-change.service';
import { VacationDayChange } from '../entity/vacation-day-change.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('VacationDayChangeService', () => {
	let service: VacationDayChangeService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				VacationDayChangeService,
				{
					provide: getRepositoryToken(VacationDayChange),
					useValue: {},
				},
			],
		}).compile();

		service = module.get<VacationDayChangeService>(VacationDayChangeService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
