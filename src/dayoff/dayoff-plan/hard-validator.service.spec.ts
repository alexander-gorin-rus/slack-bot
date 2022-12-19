import { Test, TestingModule } from '@nestjs/testing';
import { HardValidatorService } from './hard-validator.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { CalendarService } from '../../calendar/calendar.service';
import { Messages } from '../../main/messages.service';
import { SellRequestService } from '../../database/service/sell.service';
import { HelperService } from '../../main/helper.service';

describe('HardValidatorService', () => {
	let service: HardValidatorService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				HardValidatorService,
				{ provide: VacationRequestService, useValue: {} },
				{ provide: DayoffRequestService, useValue: {} },
				{ provide: CalendarService, useValue: {} },
				{ provide: Messages, useValue: {} },
				{ provide: SellRequestService, useValue: {} },
				{ provide: HelperService, useValue: {} },
			],
		}).compile();

		service = module.get<HardValidatorService>(HardValidatorService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
