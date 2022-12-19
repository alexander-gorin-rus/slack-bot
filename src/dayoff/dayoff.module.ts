import { Module } from '@nestjs/common';
import { MainModule } from '../main/main.module';
import { DayoffPlanController } from './dayoff-plan/dayoff-plan.controller';
import { HardValidatorService } from './dayoff-plan/hard-validator.service';
import { ViewService } from './dayoff-plan/view.service';
import { DayoffApproveController } from './dayoff-approve/dayoff-approve.controller';
import { SlackBotModule } from '../slack-bot/slack-bot.module';
import { PlannedDayoffController } from './planned-dayoffs/planned-dayoff.controller';
import { PlannedDayoffsService } from './planned-dayoffs/planned-dayoff.service';
import { CalendarModule } from '../calendar/calendar.module';
import { NodeMailerService } from '../main/nodemailer.service';
import { DayoffController } from './dayoff.controller';
import { DayoffPlanService } from './dayoff-plan/dayfoff-plan.service';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';

@Module({
	imports: [MainModule, SlackBotModule, CalendarModule, EmailTemplatesModule],
	providers: [
		ViewService,
		HardValidatorService,
		PlannedDayoffsService,
		NodeMailerService,
		DayoffPlanService,
	],
	controllers: [
		DayoffController,
		DayoffPlanController,
		DayoffApproveController,
		PlannedDayoffController,
	],
})
export class DayoffModule {}
