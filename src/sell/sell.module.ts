import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { MainModule } from '../main/main.module';
import { SlackBotModule } from '../slack-bot/slack-bot.module';
import { HardValidatorService } from './hard-validator.service';
import { PlannedSellController } from './planned-sells.controller';
import { SellController } from './sell.controller';
import { SellService } from './sell.service';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';

@Module({
	imports: [MainModule, CalendarModule, SlackBotModule, EmailTemplatesModule],
	controllers: [SellController, PlannedSellController],
	providers: [SellService, HardValidatorService],
})
export class SellModule {}
