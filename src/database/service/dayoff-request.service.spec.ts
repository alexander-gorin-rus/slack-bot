import { Test, TestingModule } from '@nestjs/testing';
import { DayoffRequestService } from './dayoff-request.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DayoffRequest } from '../entity/dayoff-request.entity';

describe('DayoffRequestService', () => {
	let service: DayoffRequestService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DayoffRequestService,
				{
					provide: getRepositoryToken(DayoffRequest),
					useValue: {},
				},
			],
		}).compile();

		service = module.get<DayoffRequestService>(DayoffRequestService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
