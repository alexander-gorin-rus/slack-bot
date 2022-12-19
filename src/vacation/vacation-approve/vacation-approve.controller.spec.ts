import { Test, TestingModule } from '@nestjs/testing';
// import { VacationApproveController } from './vacation-approve.controller';
import { WebClient } from '@slack/web-api';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { VacationRequestConfirmService } from '../../database/service/vacation-request-confirm.service';
import { VacationDayChangeService } from '../../database/service/vacation-day-change.service';

describe('VacationApproveController', () => {
	// let controller: VacationApproveController;
	// todo: fix env service

	beforeEach(async () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const module: TestingModule = await Test.createTestingModule({
			// controllers: [VacationApproveController],
			providers: [
				{ provide: WebClient, useValue: {} },
				{ provide: VacationRequestService, useValue: {} },
				{ provide: VacationRequestConfirmService, useValue: {} },
				{ provide: VacationDayChangeService, useValue: {} },
			],
		}).compile();

		// controller = module.get<VacationApproveController>(VacationApproveController);
	});

	it('should be defined', () => {
		// expect(controller).toBeDefined();
	});
});
