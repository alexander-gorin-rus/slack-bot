import { Global, Module } from '@nestjs/common';
import { EmployeeService } from './service/employee.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entity/employee.entity';
import { VacationRequest } from './entity/vacation-request.entity';
import { VacationRequestConfirm } from './entity/vacation-request-confirm.entity';
import { VacationRequestService } from './service/vacation-request.service';
import { VacationRequestConfirmService } from './service/vacation-request-confirm.service';
import { VacationDayChangeService } from './service/vacation-day-change.service';
import { VacationDayChange } from './entity/vacation-day-change.entity';
import { DayoffRequest } from './entity/dayoff-request.entity';
import { DayoffRequestConfirm } from './entity/dayoff-request-confirm.entity';
import { DayoffRequestService } from './service/dayoff-request.service';
import { DayoffRequestConfirmService } from './service/dayoff-request-confirm.service';
import { AdminService } from './service/admin.service';
import { Admin } from './entity/admin.entity';
import { AdminLog } from './entity/admin-log.entity';
import { AdminLogService } from './service/admin-log.service';
import { EmailTemplateService } from './service/email-template.service';
import { EmailTemplate } from './entity/email-template.entity';
import { SellRequestService } from './service/sell.service';
import { SellRequest } from './entity/sell.entity';
import { ProductionCalendar } from './entity/production-calendar.entity';
import { ProdCalendarService } from './service/production-calendar.service';
import { DaysMessages } from './entity/messages.entity';
import { DaysMessagesService } from './service/days-messages.service';
import { FeedbackRequestService } from './service/feedback-request.service';
import { FeedbackRequest } from './entity/feedback-request.entity';
import { FeedbackRespondent } from './entity/feedback-respondent.entity';
import { FeedbackRespondetService } from './service/feedback-respondent.service';
import { FeedbackAnswer } from './entity/feedback-answer.entity';
import { FeedbackQuestion } from './entity/feedback-question.entity';
import { FeedbackAmswerService } from './service/feedback-answer.service';
import { FeedbackQuestionService } from './service/feedback-question.service';
import { Position } from './entity/positions.entity';
import { PositionsService } from './service/positions.service';
import { CalendarModule } from '../calendar/calendar.module';
@Global()
@Module({
	imports: [
		TypeOrmModule.forFeature([
			Employee,
			VacationRequest,
			VacationRequestConfirm,
			VacationDayChange,
			DayoffRequest,
			DayoffRequestConfirm,
			ProductionCalendar,
			SellRequest,
			Admin,
			AdminLog,
			EmailTemplate,
			DaysMessages,
			FeedbackRequest,
			FeedbackRespondent,
			FeedbackAnswer,
			FeedbackQuestion,
			Position,
		]),
		CalendarModule,
	],
	providers: [
		EmployeeService,
		VacationRequestService,
		VacationRequestConfirmService,
		VacationDayChangeService,
		DayoffRequestService,
		DayoffRequestConfirmService,
		SellRequestService,
		ProdCalendarService,
		AdminService,
		AdminLogService,
		EmailTemplateService,
		DaysMessagesService,
		FeedbackRequestService,
		FeedbackRespondetService,
		FeedbackAmswerService,
		FeedbackQuestionService,
		PositionsService,
	],
	exports: [
		EmployeeService,
		VacationRequestService,
		VacationRequestConfirmService,
		VacationDayChangeService,
		DayoffRequestService,
		DayoffRequestConfirmService,
		SellRequestService,
		ProdCalendarService,
		AdminService,
		AdminLogService,
		EmailTemplateService,
		DaysMessagesService,
		FeedbackRequestService,
		FeedbackRespondetService,
		FeedbackAmswerService,
		FeedbackQuestionService,
		PositionsService,
	],
})
export class DatabaseModule {}
