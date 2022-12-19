import { Test, TestingModule } from '@nestjs/testing';
//import { SellController } from './sell.controller';

describe('SellController', () => {
	//let controller: SellController;
	// todo: fix environment service

	beforeEach(async () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const module: TestingModule = await Test.createTestingModule({
			//controllers: [SellController],
		}).compile();

		//controller = module.get<SellController>(SellController);
	});

	it('should be defined', () => {
		//expect(controller).toBeDefined();
	});
});
