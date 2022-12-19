import { Injectable } from '@nestjs/common';
import { Block } from '@slack/web-api';
import { ActionsEnum } from '../configs/actions';
import { Employee } from '../database/entity/employee.entity';
import { DayoffRequestService } from '../database/service/dayoff-request.service';
import { SellRequestService } from '../database/service/sell.service';
import { VacationRequestService } from '../database/service/vacation-request.service';
import { Messages } from '../main/messages.service';
import { button } from '../templates/button';
import { divider } from '../templates/divider';
import { mkdown } from '../templates/mkdown';

@Injectable()
export class HistoryService {
	private dayoffTitleTpl =
		'Дата начала отгула - `{from, date, long}`, конец - `{to, date, long}` продолжительность - ' +
		'`{days} {days, plural, one {день} few {дня} many {дней} other {}}`';
	// eslint-disable-next-line max-len
	private vacationTitleTpl =
		'Дата начала отпуска - `{from, date, long}`, конец - `{to, date, long}`, продолжительность - `{days} {days, plural, one {день} few {дня} many {дней} other {}}`';
	// eslint-disable-next-line max-len
	private sellTitleTpl =
		'Дата начала продажи - `{from, date, long}`, конец - `{to, date, long}`, количество - `{days} {days, plural, one {день} few {дня} many {дней} other {}}`';

	constructor(
		private dayoffRequestService: DayoffRequestService,
		private vacationRequestService: VacationRequestService,
		private sellRequestService: SellRequestService,
		private messages: Messages
	) {}

	public async requests(user: Employee): Promise<Array<Block>> {
		const fields = [];
		const vacationRequests = await this.vacationReq(user.id);
		const dayoffRequests = await this.dayoffReq(user.id);
		const sellRequests = await this.sellReq(user.id);
		if (!user.hasNoVacataionDays) {
			if (dayoffRequests) {
				fields.unshift(divider());
				fields.unshift(...dayoffRequests);
			}
			if (sellRequests) {
				fields.unshift(divider());
				fields.unshift(...sellRequests);
			}
			if (vacationRequests) {
				fields.unshift(divider());
				fields.unshift(...vacationRequests);
			}
			if (!dayoffRequests && !vacationRequests && !sellRequests) {
				fields.push(...this.empty(user));
			}
		} else {
			if (dayoffRequests) {
				fields.unshift(divider());
				fields.unshift(...dayoffRequests);
			} else {
				fields.push(...this.noVacEmpty(user));
			}
		}
		fields.push(button('На главную', ActionsEnum.RETURN_HOME));
		return fields;
	}

	public async dayoffReq(employeeId: number) {
		const dayoffList = await this.dayoffRequestService.findDayoffRequests(employeeId, 'finished');
		if (dayoffList.length > 0) {
			const dayoffTitles = dayoffList.map((req) => this.messages(this.dayoffTitleTpl, req));
			const blocks = [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: '*Отгулы*:',
					},
					fields: [
						{
							type: 'mrkdwn',
							text: dayoffTitles.join('\n\n') + '',
						},
					],
				},
			];
			return blocks;
		}
	}

	public async vacationReq(employeeId: number) {
		const vacList = await this.vacationRequestService.findVacationRequests(employeeId, 'finished');
		if (vacList.length > 0) {
			const vacationTitles = vacList.map((req) => this.messages(this.vacationTitleTpl, req));
			const blocks = [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: '*Отпуска*:',
					},
					fields: [
						{
							type: 'mrkdwn',
							text: vacationTitles.join('\n\n') + '',
						},
					],
				},
			];
			return blocks;
		}
	}

	public async sellReq(employeeId: number) {
		const sellList = await this.sellRequestService.findFinished(employeeId);
		if (sellList.length > 0) {
			const sellTitles = sellList.map((req) => this.messages(this.sellTitleTpl, req));
			const blocks = [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: '*Продажи дней отпуска*:',
					},
					fields: [
						{
							type: 'mrkdwn',
							text: sellTitles.join('\n\n') + '',
						},
					],
				},
			];
			return blocks;
		}
	}

	public empty(user: Employee) {
		return [mkdown(`*<@${user.slackId}>, у тебя ещё не было отпуска, продажи или отгула*`)];
	}
	public noVacEmpty(user: Employee) {
		return [mkdown(`*<@${user.slackId}>, у тебя ещё не было отгула*`)];
	}
}
