import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplateService } from './email-template.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailTemplate } from '../entity/email-template.entity';

describe('EmailTemplateService', () => {
	let service: EmailTemplateService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				EmailTemplateService,
				{
					provide: getRepositoryToken(EmailTemplate),
					useValue: {},
				},
			],
		}).compile();

		service = module.get<EmailTemplateService>(EmailTemplateService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
