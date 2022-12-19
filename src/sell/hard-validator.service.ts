import { Injectable } from '@nestjs/common';
import { Employee } from '../database/entity/employee.entity';
import { SellRequestService } from '../database/service/sell.service';
import { VacationRequestService } from '../database/service/vacation-request.service';
import { HelperService } from '../main/helper.service';
import { addDays } from '../lib/functions';
import { Messages } from '../main/messages.service';
import { SellInterface } from './sell.interface';

@Injectable()
export class HardValidatorService {
	constructor(
		private vacationRequestService: VacationRequestService,
		private messages: Messages,
		private sellRequestService: SellRequestService,
		private helper: HelperService
	) {}

	async twoWeeksValidate(startDate: Date, employee: Employee) {
		const to = addDays(startDate, 13);
		const overlappingSellList = await this.sellRequestService.findCrossingRequest(
			employee,
			startDate,
			to
		);
		if (overlappingSellList.length > 0) {
			return {
				date: this.messages(
					'Ты не можешь уйти в цельный 14-ти дневный отпуск, так как у тебя уже назначена продажа' +
						' с {from, date, long} по {to, date, long}\nВыбери другой день начала отпуска.',
					overlappingSellList[0]
				),
			};
		}

		const overlappingVacationList = await this.vacationRequestService.findCrossingRequest(
			employee,
			startDate,
			to,
			'completed'
		);
		if (overlappingVacationList.length > 1) {
			return {
				date: this.messages(
					'Ты не можешь уйти в цельный 14-ти дневный отпуск, так как у тебя уже назначен отпуск' +
						' с {from, date, long} по {to, date, long}\nВыбери другой день начала отпуска.',
					overlappingVacationList[0]
				),
			};
		}

		const crossingVacationList = await this.vacationRequestService.findCrossingRequest(
			employee,
			startDate,
			to,
			'await'
		);

		if (crossingVacationList.length > 0) {
			return {
				date: this.messages(
					'Ты не можешь уйти в цельный 14-ти дневный отпуск, так как ты уже планируешь отпуск' +
						' с {from, date, long} по {to, date, long}\nВыбери другой день начала отпуска.',
					crossingVacationList[0]
				),
			};
		}
	}

	async validate(
		{ date, days }: SellInterface,
		employee: Employee,
		daysToAdd: number,
		daysToRequest: number
	): Promise<null | Record<string, string>> {
		if (new Date(date) < new Date()) {
			return {
				date: this.messages('Выбери дату начала продажи не ранее, чем {minDate, date, long}', {
					minDate: Date.now() + daysToRequest * 24 * 60 * 60 * 1000,
				}),
			};
		}
		const numRegexp = /^\d{1,4}$/;
		if (!numRegexp.test(days)) {
			return {
				days: 'В поле ввода можно вводить только цифры',
			};
		}
		if (Number(days) > this.helper.round(employee.days)) {
			return {
				days: 'Введите число, не превышающее кол-во доступных дней отпуска',
			};
		}
		const to = addDays(date, Number(days) - 1 + daysToAdd);

		const overlappingSellList = await this.sellRequestService.findCrossingRequest(
			employee,
			date,
			to
		);
		if (overlappingSellList.length > 0) {
			return {
				date: this.messages(
					'У тебя уже назначена продажа с {from, date, long} по {to, date, long}\nВыбери другой день для продажи.',
					overlappingSellList[0]
				),
			};
		}

		const overlappingVacationList = await this.vacationRequestService.findCrossingRequest(
			employee,
			date,
			to,
			'completed'
		);
		if (overlappingVacationList.length > 1) {
			return {
				date: this.messages(
					'У тебя уже назначен отпуск с {from, date, long} по {to, date, long}\nВыбери другой день для продажи.',
					overlappingVacationList[0]
				),
			};
		}

		const crossingVacationList = await this.vacationRequestService.findCrossingRequest(
			employee,
			date,
			to,
			'await'
		);
		if (crossingVacationList.length > 0) {
			return {
				date: this.messages(
					'Ты уже планируешь отпуск с {from, date, long} по {to, date, long}\nВыбери другой день для продажи.',
					crossingVacationList[0]
				),
			};
		}

		return null;
	}
}
