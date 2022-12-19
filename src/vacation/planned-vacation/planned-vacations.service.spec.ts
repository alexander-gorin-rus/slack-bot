import { Test, TestingModule } from '@nestjs/testing';
import { PlannedVacationsService } from './planned-vacations.service';
import { CalendarService } from '../../calendar/calendar.service';
import { Messages } from '../../main/messages.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { SellRequestService } from '../../database/service/sell.service';
import { WebClient } from '@slack/web-api';

describe('PlannedVacationsService', () => {
	let service: PlannedVacationsService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PlannedVacationsService,
				{ provide: VacationRequestService, useValue: {} },
				{ provide: SellRequestService, useValue: {} },
				{ provide: WebClient, useValue: {} },
				{ provide: Messages, useValue: {} },
				{ provide: CalendarService, useValue: {} },
			],
		}).compile();

		service = module.get<PlannedVacationsService>(PlannedVacationsService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
