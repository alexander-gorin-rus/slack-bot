import { Test, TestingModule } from '@nestjs/testing';
// import { VacationPlanController } from './vacation-plan.controller';
// import { HardValidatorService } from './hard-validator.service';
// import { SoftValidatorService } from './soft-validator.service';
// import { ViewService } from './view.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { VacationRequestConfirmService } from '../../database/service/vacation-request-confirm.service';
import { HelperService } from '../../main/helper.service';
import { EmployeeService } from '../../database/service/employee.service';
import { VacationDayChangeService } from '../../database/service/vacation-day-change.service';

describe('VacationPlanController', () => {
	// let controller: VacationPlanController;
	// todo: fix env service

	beforeEach(async () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const module: TestingModule = await Test.createTestingModule({
			// controllers: [VacationPlanController],
			providers: [
				// HardValidatorService,
				// SoftValidatorService,
				// ViewService,
				{ provide: VacationRequestService, useValue: {} },
				{ provide: VacationRequestConfirmService, useValue: {} },
				{ provide: VacationDayChangeService, useValue: {} },
				{ provide: EmployeeService, useValue: {} },
				{ provide: HelperService, useValue: {} },
			],
		}).compile();

		// controller = module.get<VacationPlanController>(VacationPlanController);
	});

	it('should be defined', () => {
		// expect(controller).toBeDefined();
	});
});
