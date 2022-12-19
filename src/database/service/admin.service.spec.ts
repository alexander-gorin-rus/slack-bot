import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { Admin } from '../entity/admin.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('AdminService', () => {
	let service: AdminService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AdminService,
				{
					provide: getRepositoryToken(Admin),
					useValue: {},
				},
			],
		}).compile();

		service = module.get<AdminService>(AdminService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
