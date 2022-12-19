import { Injectable } from '@nestjs/common';
import { VacationPlanInterface } from './vacation-plan.interface';
import { Employee } from '../../database/entity/employee.entity';
import { Messages } from '../../main/messages.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { CalendarService } from '../../calendar/calendar.service';
import { SellRequestService } from '../../database/service/sell.service';
import { addDays, convertDate } from '../../lib/functions';

export const MINIMAL_START_DATE = 45;

@Injectable()
export class SoftValidatorService {
	constructor(
		private messages: Messages,
		private vacationRequestService: VacationRequestService,
		private sellRequestService: SellRequestService,
		private calendar: CalendarService
	) {}

	async validate(
		{ days, date }: VacationPlanInterface,
		user: Employee,
		sellDays = 0,
		holidaysDays = 0,
		sellHolidayDays = 0
	): Promise<string[]> {
		const errorMsgList: string[] = [];
		// if planing vacation before sell
		const beforeTo = addDays(date, Number(days) - 1 - sellDays);

		if (Number(days) > Number(user.days)) {
			errorMsgList.push(
				':exclamation: Продолжительность запрашиваемого отпуска превышает число доступных тебе дней отпуска на данный момент.'
			);
		}

		const vacationStartDate = new Date(date);
		const vacationEndDate = addDays(vacationStartDate, Number(days) + holidaysDays - 1);
		const sellEndData = addDays(vacationEndDate, sellDays + sellHolidayDays);
		const sellTo = await addDays(vacationEndDate, sellDays);
		const overlappingSellList = await this.sellRequestService.findCrossingRequest(
			user,
			new Date(date),
			sellTo
		);
		const hasOverlappingSells = overlappingSellList.length !== 0;

		if (sellDays) {
			errorMsgList.push(
				// eslint-disable-next-line max-len
				this.messages(
					':warning: Ты берешь отпуск, некратный неделе. Чтобы компенсировать выходные дни, с твоего счета отпускных дней будет продано дополнительно: {days}.' +
						'\nДата окончания отпуска - {to, date, long}',
					{ days: sellDays, to: sellTo }
				)
			);
		}

		const vacationEndDateWithSellDays = addDays(
			vacationStartDate,
			Number(days) + sellDays + holidaysDays - 1
		);
		if (holidaysDays !== 0) {
			// eslint-disable-next-line max-len
			errorMsgList.push(
				`:exclamation: Во время планируемого отпуска будут праздники, поэтому дата окончания отпуска будет увеличена до ${convertDate(
					vacationEndDateWithSellDays
				)}`
			);
		}

		errorMsgList.push(
			this.messages('Официальная дата окончания запрашиваемого отпуска - {to, date, long}', {
				to: sellEndData,
			})
		);

		const vacationRequestAllowDate = this.calendar.today();
		vacationRequestAllowDate.setDate(vacationRequestAllowDate.getDate() + MINIMAL_START_DATE);
		if (vacationStartDate < vacationRequestAllowDate) {
			errorMsgList.push(
				':exclamation: До начала отпуска осталось менее полутора месяцев. Это может вызвать трудности при согласовании.'
			);
		}

		const nearVacationRequests = await this.vacationRequestService.findNearRequests(
			user,
			vacationStartDate,
			vacationEndDateWithSellDays
		);

		if (holidaysDays && nearVacationRequests.length) {
			const planedVacations = nearVacationRequests
				.map((vacationRequest) => {
					return this.messages('c {from, date, long} по {to, date, long}', vacationRequest);
				})
				.join(', \n');
			const msg =
				':exclamation: Между запрашиваемым отпуском c {from, date, long} по {to, date, long} ' +
				'и другими ближайшими отпусками должно быть не менее 3 месяцев. Ближайшие утвержденные/прошедшие отпуска:\n' +
				'{planedVacations}';

			const msgToDate = hasOverlappingSells ? beforeTo : vacationEndDateWithSellDays;
			errorMsgList.push(
				this.messages(msg, {
					from: new Date(date),
					to: msgToDate,
					planedVacations,
				})
			);
		}

		if (
			(holidaysDays && nearVacationRequests.length) ||
			vacationStartDate < vacationRequestAllowDate ||
			Number(days) > Number(user.days)
		) {
			errorMsgList.push(
				'Напоминаю: такой отпуск согласовывается в исключительных случаях с руководителями.'
			);
		}

		return errorMsgList;
	}
}
