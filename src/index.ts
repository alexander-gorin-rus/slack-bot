import * as dotenv from 'dotenv';

dotenv.config();
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SlackBotService } from './slack-bot/slack-bot.service';
import { AppNestLogger } from './app.nest-logger';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

async function bootstrap() {
	const nestApp = await NestFactory.create(AppModule, {
		logger: new AppNestLogger(),
	});
	if (process.env.SENTRY_DSN) {
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			serverName: process.env.SENTRY_NAME || 'NoName',
		});
	}
	nestApp.enableCors();
	const slackBotService = nestApp.get(SlackBotService);
	const logger = nestApp.get(Logger);
	const express = nestApp.get('express');
	await slackBotService.init();
	try {
		logger.log('Start bot application');
		await slackBotService.start();
		logger.log('Bot started');
		express.listen(process.env.ADMIN_PORT || 8080, () => logger.log('Start admin'));
		nestApp.listen(process.env.PORT || 9999);
	} catch (e) {
		logger.error(e);
	}
}

bootstrap().then();
