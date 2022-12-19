import { Test, TestingModule } from '@nestjs/testing';
import { DayoffRequestConfirmService } from './dayoff-request-confirm.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DayoffRequestConfirm } from '../entity/dayoff-request-confirm.entity';

describe('DayoffRequestConfirmService', () => {
	let service: DayoffRequestConfirmService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DayoffRequestConfirmService,
				{
					provide: getRepositoryToken(DayoffRequestConfirm),
					useValue: {},
				},
			],
		}).compile();

		service = module.get<DayoffRequestConfirmService>(DayoffRequestConfirmService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
