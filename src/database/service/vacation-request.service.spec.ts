import { Test, TestingModule } from '@nestjs/testing';
import { VacationRequestService } from './vacation-request.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VacationRequest } from '../entity/vacation-request.entity';
import { CalendarService } from '../../calendar/calendar.service';

describe('VacationRequestService', () => {
	let service: VacationRequestService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				VacationRequestService,
				{
					provide: getRepositoryToken(VacationRequest),
					useValue: {},
				},
				{ provide: CalendarService, useValue: {} },
			],
		}).compile();

		service = module.get<VacationRequestService>(VacationRequestService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
