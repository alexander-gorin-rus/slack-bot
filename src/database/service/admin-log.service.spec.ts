import { Test, TestingModule } from '@nestjs/testing';
import { AdminLogService } from './admin-log.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminLog } from '../entity/admin-log.entity';

describe('AdminLogService', () => {
	let service: AdminLogService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AdminLogService,
				{
					provide: getRepositoryToken(AdminLog),
					useValue: {},
				},
			],
		}).compile();

		service = module.get<AdminLogService>(AdminLogService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
