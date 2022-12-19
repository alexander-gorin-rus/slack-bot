import { Logger, Module } from '@nestjs/common';
import { VacationModule } from './vacation/vacation.module';
import { HomeModule } from './home/home.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MainModule } from './main/main.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SlackBotModule } from './slack-bot/slack-bot.module';
import { DayoffModule } from './dayoff/dayoff.module';
import { AdminModule } from './admin/admin.module';
import { HistoryModule } from './history/history.module';
import { SellModule } from './sell/sell.module';
import { FeedbackService } from './feedback/feedback.service';
import { FeedbackModule } from './feedback/feedback.module';
import ormConfig from '../ormconfig';
import { EmployeesModule } from './employees/employees.module';
import { KafkaModule } from './kafka/kafka.module';
import { env } from './configs/env';
import { KafkaSubscribersModule } from './kafka-subscribers/kafka-subscriber.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';

@Module({
	imports: [
		SlackBotModule,
		TypeOrmModule.forRoot(ormConfig),
		ScheduleModule.forRoot(),
		MainModule,
		HomeModule,
		VacationModule,
		DayoffModule,
		AdminModule,
		HistoryModule,
		SellModule,
		FeedbackModule,
		KafkaModule.register({
			clientId: env.KAFKA_GROUP_ID,
			brokers: env.KAFKA_BROKERS,
			groupId: env.KAFKA_GROUP_ID,
			initMigration: env.KAFKA_INIT_MIGRATION,
		}),
		KafkaSubscribersModule,
		EmployeesModule,
		EmailTemplatesModule,
	],
	controllers: [],
	providers: [Logger, FeedbackService],
})
export class AppModule {}
