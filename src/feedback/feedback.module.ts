import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { MainModule } from '../main/main.module';
import { SlackBotModule } from '../slack-bot/slack-bot.module';

@Module({
	imports: [MainModule, SlackBotModule],
	providers: [FeedbackService],
	controllers: [FeedbackController],
})
export class FeedbackModule {}
