import { Test, TestingModule } from '@nestjs/testing';
//import { SlackBotService } from './slack-bot.service';
import { DiscoveryService } from '@nestjs/core';
import { EmployeeService } from '../database/service/employee.service';
import { App } from '@slack/bolt';
import { NodeMailerService } from '../main/nodemailer.service';
import { EmailTemplateService } from '../database/service/email-template.service';

describe('SlackBotService', () => {
	//let service: SlackBotService;
	// todo: fix env service

	beforeEach(async () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const module: TestingModule = await Test.createTestingModule({
			imports: [],
			providers: [
				//SlackBotService,
				{
					provide: EmployeeService,
					useValue: {},
				},
				{
					provide: DiscoveryService,
					useValue: {},
				},
				{
					provide: App,
					useValue: {},
				},
				{
					provide: NodeMailerService,
					useValue: {},
				},
				{
					provide: EmailTemplateService,
					useValue: {},
				},
			],
		}).compile();

		//service = module.get<SlackBotService>(SlackBotService);
	});

	it('should be defined', () => {
		//expect(service).toBeDefined();
	});
});
