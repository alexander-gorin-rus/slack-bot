import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProdCalendarService } from '../database/service/production-calendar.service';
import { CalendarService } from './calendar.service';

@Injectable()
export class CalendarCronService {
	constructor(private calendarService: ProdCalendarService, private calendar: CalendarService) {}

	@Cron('0 * 1 8 *') // every year at 1 aug -> every hour at 0 minute
	private async addNewYear() {
		const currentYear = this.calendar.today().getFullYear();
		const nextYear = currentYear + 1;
		const calendar = await this.calendarService.getByYear(nextYear);
		if (calendar.length)
			// OK, calendar already there
			return;
		await this.calendarService.addYear(nextYear);
	}
}
