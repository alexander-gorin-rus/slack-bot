import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CalendarService } from './calendar.service';

@Global()
@Module({
	imports: [ScheduleModule],
	providers: [CalendarService],
	exports: [CalendarService],
})
export class CalendarModule {}
