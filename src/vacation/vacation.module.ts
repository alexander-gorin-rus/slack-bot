import { Module } from '@nestjs/common';
import { VacationPlanController } from './vacation-plan/vacation-plan.controller';
import { HardValidatorService } from './vacation-plan/hard-validator.service';
import { SoftValidatorService } from './vacation-plan/soft-validator.service';
import { ViewService } from './vacation-plan/view.service';
import { MainModule } from '../main/main.module';
import { NodeMailerService } from '../main/nodemailer.service';
import { VacationApproveController } from './vacation-approve/vacation-approve.controller';
import { CalendarModule } from '../calendar/calendar.module';
import { SlackBotModule } from '../slack-bot/slack-bot.module';
import { PlannedVacationController } from './planned-vacation/planned-vacation.controller';
import { PlannedVacationsService } from './planned-vacation/planned-vacations.service';
import { CalculationController } from './calculation/calculation.controller';
import { SellModule } from '../sell/sell.module';
import { VacationController } from './vacation.controller';
import { VacationPlanService } from './vacation-plan/vacation-plan.service';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';

@Module({
	imports: [MainModule, CalendarModule, SlackBotModule, SellModule, EmailTemplatesModule],
	controllers: [
		VacationPlanController,
		VacationApproveController,
		PlannedVacationController,
		CalculationController,
		VacationController,
	],
	providers: [
		HardValidatorService,
		SoftValidatorService,
		ViewService,
		NodeMailerService,
		PlannedVacationsService,
		VacationPlanService,
	],
})
export class VacationModule {}
