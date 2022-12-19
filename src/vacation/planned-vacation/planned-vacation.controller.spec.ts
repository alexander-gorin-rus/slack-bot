import { Test, TestingModule } from '@nestjs/testing';
//import { PlannedVacationController } from './planned-vacation.controller';

describe('PlannedVacationController', () => {
	//let controller: PlannedVacationController;
	// todo: fix env service

	beforeEach(async () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const module: TestingModule = await Test.createTestingModule({
			//controllers: [PlannedVacationController],
		}).compile();

		//controller = module.get<PlannedVacationController>(PlannedVacationController);
	});

	it('should be defined', () => {
		//expect(controller).toBeDefined();
	});
});
