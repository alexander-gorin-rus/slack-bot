import { Module } from '@nestjs/common';
import { HelperService } from './helper.service';
import { Messages } from './messages.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { NodeMailerService } from './nodemailer.service';
import { messageFormat } from '../utils';
import { HealtchCheckController } from './healthcheck.controller';
import { SlackMessagesServices } from './slack-messages.service';

@Module({
	imports: [
		MailerModule.forRootAsync({
			useFactory: () => ({
				transport: {
					host: process.env.SMTP_HOST,
					port: Number(process.env.SMTP_PORT),
					secure: false,
					auth: process.env.MAILER_LOGIN
						? {
								user: process.env.MAILER_LOGIN,
								pass: process.env.MAILER_PASS,
						  }
						: null,
				},
			}),
		}),
	],
	providers: [
		HelperService,
		NodeMailerService,
		SlackMessagesServices,
		{
			provide: Messages,
			useFactory() {
				return messageFormat;
			},
		},
	],
	controllers: [HealtchCheckController],
	exports: [HelperService, Messages, NodeMailerService, SlackMessagesServices],
})
export class MainModule {}
