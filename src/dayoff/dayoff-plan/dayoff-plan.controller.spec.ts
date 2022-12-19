import { Test, TestingModule } from '@nestjs/testing';
//import { DayoffPlanController } from './dayoff-plan.controller';

// @todo: fix env service

describe('DayoffPlanController', () => {
	//let controller: DayoffPlanController;

	beforeEach(async () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const module: TestingModule = await Test.createTestingModule({
			// controllers: [DayoffPlanController],
		}).compile();

		// controller = module.get<DayoffPlanController>(DayoffPlanController);
	});

	it('should be defined', () => {
		//expect(controller).toBeDefined();
	});
});
