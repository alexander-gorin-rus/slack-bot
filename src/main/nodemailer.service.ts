import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { EmailMessageOption } from './email-message-option.interface';
import * as process from 'process';
import { EmailTemplateService } from '../database/service/email-template.service';
import { Messages } from './messages.service';
import ejs from 'ejs';
import { SentryOverwatch } from './sentry.overwatch';
import { EmailTemplate } from '../database/entity/email-template.entity';

const MAX_RETRY_ATTEMPT_COUNT = 10;
const START_RETRY_ATTEMPT_NUMBER = 1;

@Injectable()
export class NodeMailerService {
	constructor(
		private readonly mailerService: MailerService,
		private readonly emailTemplateService: EmailTemplateService,
		private readonly messages: Messages
	) {}

	//retry
	@SentryOverwatch({ module: 'nodeMailer', job: 'retry mailing' })
	retry(cb: () => Promise<void>, ms: number, attemptNumber: number) {
		if (attemptNumber > MAX_RETRY_ATTEMPT_COUNT)
			throw new Error('Достигнуто максимальное количество попыток отправки письма.');

		return new Promise((resolve) => {
			cb()
				.then(resolve)
				.catch((error) => {
					setTimeout(() => {
						// eslint-disable-next-line no-console
						console.log(error);
						this.retry(cb, ms * 2, ++attemptNumber).then(resolve);
					}, ms);
				});
		});
	}

	async sendMessage({ to, subject, html, references }: EmailMessageOption) {
		const res = await this.retry(
			() =>
				this.mailerService.sendMail({
					from: process.env.MAILER_SENDER_EMAIL,
					to,
					subject,
					html,
					references,
				}),
			1000,
			START_RETRY_ATTEMPT_NUMBER
		);

		return res;
	}

	async send(to: string | string[], code: string, data: any, options?: any) {
		const template: EmailTemplate = await this.emailTemplateService.getByCode(code);
		let { emails } = template;

		if (code === 'dayoffApproveForFinDep' && options) {
			if (data.request.workingOff === 'нет') {
				emails = options.isWorkingOff(data, emails);
			}
		}

		const receivers = (!!emails && emails.toString() + ',' + to) || to;

		const templateData = { ...data, messages: this.messages };
		const subject = ejs.render(template.subject, templateData);
		const html = ejs.render(template.template, templateData);

		data.messages = this.messages;

		const res = await this.retry(
			() =>
				this.mailerService.sendMail({
					from: process.env.MAILER_SENDER_EMAIL,
					to: receivers,
					subject,
					html,
				}),
			1000,
			START_RETRY_ATTEMPT_NUMBER
		);

		return res;
	}
}
