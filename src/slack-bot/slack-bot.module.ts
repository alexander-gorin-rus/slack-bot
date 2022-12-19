import { Module } from '@nestjs/common';
import { SlackBotService } from './slack-bot.service';
import { DiscoveryModule } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { LogLevel, WebClient } from '@slack/web-api';
import { App } from '@slack/bolt';
import * as dotenv from 'dotenv';
dotenv.config();
import { env } from '../configs/env';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { AppBotLogger } from '../app.bot-logger';
import { MainModule } from '../main/main.module';

const appProvider: Provider = {
	provide: App,
	useFactory: () => {
		return new App({
			token: env.BOT_TOKEN,
			logger: new AppBotLogger(),
			logLevel: LogLevel.DEBUG,
			appToken: env.SLACK_APP_TOKEN,
			socketMode: true,
		});
	},
};

const webClientProvider: Provider = {
	provide: WebClient,
	useFactory: () => {
		return new WebClient(env.BOT_TOKEN, {
			logger: new AppBotLogger(),
			logLevel: LogLevel.DEBUG,
		});
	},
};

@Module({
	imports: [DiscoveryModule, DatabaseModule, MainModule],
	providers: [appProvider, webClientProvider, SlackBotService],
	exports: [webClientProvider],
})
export class SlackBotModule {}
