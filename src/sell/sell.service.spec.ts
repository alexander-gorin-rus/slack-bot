import { Test, TestingModule } from '@nestjs/testing';
import { SellService } from './sell.service';
import { Messages } from '../main/messages.service';
import { HelperService } from '../main/helper.service';

describe('SellService', () => {
	let service: SellService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SellService,
				{ provide: HelperService, useValue: {} },
				{ provide: Messages, useValue: {} },
			],
		}).compile();

		service = module.get<SellService>(SellService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
