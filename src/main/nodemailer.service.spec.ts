import { Test, TestingModule } from '@nestjs/testing';
import { NodeMailerService } from './nodemailer.service';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailTemplateService } from '../database/service/email-template.service';
import { Messages } from './messages.service';

describe('MailerService', () => {
	let service: NodeMailerService;
	let sendMailArgument: any;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				NodeMailerService,
				{
					provide: MailerService,
					useValue: {
						// eslint-disable-next-line require-await
						sendMail: async (arg) => {
							sendMailArgument = arg;
						},
					},
				},
				{
					provide: EmailTemplateService,
					useValue: {
						// eslint-disable-next-line require-await
						getByCode: async () => {
							return {
								subject: 'hello <%= user.name %>',
								template: 'your fullname <%= user.name %> <%= user.surname %>',
								emails: null,
							};
						},
					},
				},
				{
					provide: Messages,
					useValue: () => '',
				},
			],
		}).compile();

		service = module.get<NodeMailerService>(NodeMailerService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('compile template', async () => {
		await service.send('test@test.ru', '', {
			user: { name: 'Jon', surname: 'Dow' },
		});
		expect(sendMailArgument.subject).toEqual('hello Jon');
		expect(sendMailArgument.html).toEqual('your fullname Jon Dow');
	});
});
