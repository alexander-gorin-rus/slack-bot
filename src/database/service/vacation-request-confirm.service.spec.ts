import { Test, TestingModule } from '@nestjs/testing';
import { VacationRequestConfirmService } from './vacation-request-confirm.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VacationRequestConfirm } from '../entity/vacation-request-confirm.entity';

describe('VacationRequestConfirmService', () => {
	let service: VacationRequestConfirmService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				VacationRequestConfirmService,
				{
					provide: getRepositoryToken(VacationRequestConfirm),
					useValue: {},
				},
			],
		}).compile();

		service = module.get<VacationRequestConfirmService>(VacationRequestConfirmService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
