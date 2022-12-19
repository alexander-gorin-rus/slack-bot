import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { MainModule } from '../main/main.module';
import { SlackBotModule } from '../slack-bot/slack-bot.module';

@Module({
	imports: [MainModule, SlackBotModule],
	controllers: [HomeController],
	providers: [],
})
export class HomeModule {}
