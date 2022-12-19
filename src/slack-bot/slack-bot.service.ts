import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { Context } from './context/context';
import { EmployeeService } from '../database/service/employee.service';
import { Employee } from '../database/entity/employee.entity';
import { ContextFormDataParser } from './context/context-form-data-parser';
import { CodedError } from '@slack/web-api';
import { App } from '@slack/bolt';
import { OptionsClass } from './decorator/options.class';
import { NodeMailerService } from '../main/nodemailer.service';
import { EmailTemplateService } from '../database/service/email-template.service';
import { EmailTemplate } from '../database/entity/email-template.entity';
import * as Sentry from '@sentry/node';
import { mkdown } from '../templates/mkdown';

import { captureException } from '../_services/sentry';

@Injectable()
export class SlackBotService {
	private formDataParser = new ContextFormDataParser();

	constructor(
		private readonly discovery: DiscoveryService,
		private readonly service: EmployeeService,
		private readonly app: App,
		private readonly nodeMailerService: NodeMailerService,
		private readonly emailTemplateService: EmailTemplateService
	) {}

	emailTemplates: string[] = [];

	private getMethodNames(obj) {
		const properties = [];
		let currentObj = obj;
		while (currentObj) {
			properties.push(...Object.getOwnPropertyNames(currentObj));
			currentObj = Object.getPrototypeOf(currentObj);
		}
		return properties.filter((item) => typeof obj[item] === 'function');
	}

	private getPropertyNames(obj) {
		const properties = [];
		let currentObj = obj;
		while (currentObj) {
			properties.push(...Object.getOwnPropertyNames(currentObj));
			currentObj = Object.getPrototypeOf(currentObj);
		}
		return properties.filter((item) => typeof obj[item] !== 'function');
	}

	async init() {
		this.app.error(async (e: CodedError): Promise<void> => {
			await captureException(e);
			console.error(e);
		});
		for (const controller of this.discovery.getControllers()) {
			for (const methodName of this.getMethodNames(controller.instance)) {
				if (Reflect.hasMetadata('event', controller.instance[methodName])) {
					const metadata = Reflect.getMetadata('event', controller.instance[methodName]);
					this.app.event(
						metadata.name,
						this.wrapper(controller.instance, methodName, metadata.options)
					);
				}
				if (Reflect.hasMetadata('action', controller.instance[methodName])) {
					const metadata = Reflect.getMetadata('action', controller.instance[methodName]);
					this.app.action(
						metadata.name,
						this.wrapper(controller.instance, methodName, metadata.options)
					);
				}
				if (Reflect.hasMetadata('view', controller.instance[methodName])) {
					const metadata = Reflect.getMetadata('view', controller.instance[methodName]);
					this.app.view(
						metadata.name,
						this.wrapper(controller.instance, methodName, metadata.options)
					);
				}
			}

			if (Reflect.has(controller.instance, 'email-template')) {
				const emailTemplateMap = Reflect.get(controller.instance, 'email-template') as Map<
					string,
					string
				>;
				emailTemplateMap.forEach((code, property) => {
					this.emailTemplates.push(code);
					controller.instance[property] = (to: string, data: any, options: any) => {
						this.nodeMailerService.send(to, code, data, options);
					};
				});
			}
		}

		for (const service of this.discovery.getProviders()) {
			if (service.instance && Reflect.has(service.instance, 'email-template')) {
				const emailTemplateMap = Reflect.get(service.instance, 'email-template') as Map<
					string,
					string
				>;
				emailTemplateMap.forEach((code, property) => {
					this.emailTemplates.push(code);
					service.instance[property] = (to: string, data: any, options: any) => {
						this.nodeMailerService.send(to, code, data, options);
					};
				});
			}
		}
		await this.postInit();
	}

	private wrapper(object, method, options: OptionsClass) {
		return async (param) => {
			let userSlackId = null;
			if ('user' in param.payload) {
				userSlackId = param.payload.user;
			} else if ('user' in param.body) {
				userSlackId = param.body.user.id;
			} else {
				console.error('userSlackId not found');
			}
			const client = param.client;
			let ack = () => null;
			if ('ack' in param) {
				ack = param.ack;
			}
			let say = () => null;
			if ('say' in param) {
				say = param.say;
			}

			let user: Employee | undefined;
			try {
				user = await this.getUser(userSlackId);
			} catch (e) {
				// add log message
			}

			if (user || options.allowGuest) {
				try {
					const actionContext = new Context(
						user,
						client.views,
						ack,
						say,
						param.body.trigger_id,
						param.body.view?.id,
						this.formDataParser.parse(
							param.payload?.state?.values,
							param.payload?.private_metadata
						),
						param.action?.value,
						param.body.message?.ts,
						param.body.channel?.id,
						userSlackId
					);
					try {
						return object[method](actionContext);
					} catch (e) {
						process.env.SENTRY_DSN ? Sentry.captureException(e, {}) : console.error(e);
					}
				} catch (e) {
					await ack();
					await client.views.publish({
						user_id: userSlackId,
						view: {
							type: 'home',
							blocks: [
								mkdown(`*:wave: Привет, <@${userSlackId}>! Произошла ошибка.*`),
								mkdown(`* ${e.toString()}.*`),
							],
						},
					});
				}
			} else {
				await client.views.publish({
					user_id: userSlackId,
					view: {
						type: 'home',
						blocks: [
							mkdown(`*:wave: Привет, <@${userSlackId}>!*`),
							mkdown('*Твой доступ в UIT Bot в процессе создания. Попробуй зайти позже.*'),
						],
					},
				});
			}
		};
	}

	private async getUser(userSlackId): Promise<Employee> {
		const employees = await this.service.find({
			where: { slackId: userSlackId },
			relations: ['head'],
		});
		if (employees[0]) {
			return employees[0];
		} else {
			throw new Error(`User "${userSlackId}" not found`);
		}
	}

	public async start() {
		await this.app.start();
	}

	private async postInit() {
		await Promise.all(
			this.emailTemplates.map(async (item) => {
				try {
					await this.emailTemplateService.getByCode(item);
				} catch (e) {
					const tpl = new EmailTemplate();
					tpl.code = item;
					tpl.name = 'New template:' + new Date().toString();
					tpl.template = '';
					tpl.subject = '';
					await this.emailTemplateService.save(tpl);
				}
			})
		);
	}
}
