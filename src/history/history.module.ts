import { Module } from '@nestjs/common';
import { MainModule } from '../main/main.module';
import { NodeMailerService } from '../main/nodemailer.service';
import { SlackBotModule } from '../slack-bot/slack-bot.module';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';

@Module({
	imports: [MainModule, SlackBotModule, EmailTemplatesModule],
	controllers: [HistoryController],
	providers: [HistoryService, NodeMailerService],
})
export class HistoryModule {}
