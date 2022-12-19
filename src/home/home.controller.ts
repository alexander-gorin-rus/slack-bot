/* eslint-disable max-len */
import { Controller } from '@nestjs/common';
import { Event } from '../slack-bot/decorator/event.decorator';
import { Action } from '../slack-bot/decorator/action.decorator';
import { ActionsEnum } from '../configs/actions';
import { mkdown } from '../templates/mkdown';
import { button } from '../templates/button';
import { divider } from '../templates/divider';
import { Context } from '../slack-bot/context/context';
import { HelperService } from '../main/helper.service';
import { ActionsBlock, DividerBlock, KnownBlock, WebClient } from '@slack/web-api';
import { header } from '../templates/header';
import { DayoffRequestService } from '../database/service/dayoff-request.service';
import { VacationRequestService } from '../database/service/vacation-request.service';
import { SellRequestService } from '../database/service/sell.service';
import { SoloProprietorStatus } from '../database/util/employee-solo-proprietor-status.enum';
import { employeeHelp, IPHelp, VIPIPHelp } from './help';
import { messageFormat } from '../utils';

@Controller('main')
export class HomeController {
	constructor(
		private helper: HelperService,
		private client: WebClient,
		private dayoffRequestService: DayoffRequestService,
		private vacationRequestService: VacationRequestService,
		private sellRequestService: SellRequestService
	) {}

	@Event('app_home_opened')
	@Action(ActionsEnum.RETURN_HOME)
	async home({ user, views }: Context): Promise<void> {
		if (user.active) {
			const days = this.helper.round(user.days);
			if (!user.hasNoVacataionDays) {
				const blocks = [
					mkdown(
						`*:wave: Привет, <@${user.slackId}>! Я ` +
							(process.env.ADMINJS_TEXT_LOGO || 'UIT Bot') +
							', готов помочь тебе. С чего начнем?*'
					),
					button(':gear: Сервисы', ActionsEnum.SERVICES_MODAL),
				];

				const otherBlock: (ActionsBlock | DividerBlock)[] = [divider()];

				const plannedVacations = await this.vacationRequestService.count(user.id);
				const plannedDayoffs = await this.dayoffRequestService.count(user.id);
				const plannedSells = await this.sellRequestService.count(user.id);
				const historyVacs = await this.vacationRequestService.findVacationRequests(
					user.id,
					'finished'
				);
				const historyDayoffs = await this.dayoffRequestService.findDayoffRequests(
					user.id,
					'finished'
				);
				const historySells = await this.sellRequestService.findFinished(user.id);

				if (historyVacs.length || historyDayoffs.length || historySells.length) {
					blocks.push(button(':scroll: История', ActionsEnum.HISTORY));
				}

				if (plannedVacations && user.SPStatus !== SoloProprietorStatus.SOLO_PROPRIETOR) {
					blocks.push(button(':airplane: Запланированные отпуска', ActionsEnum.PLANNED_VACATIONS));
				}

				if (plannedDayoffs) {
					blocks.push(button(':dancer: Запланированные отгулы', ActionsEnum.PLANNED_DAYOFFS));
				}

				if (plannedSells && !user.SPStatus) {
					blocks.push(button(':moneybag: Запланированные продажи', ActionsEnum.PLANNED_SELLS));
				}

				// disabled in this version
				// if (user.isHR) {
				// 	otherBlock.push(button(':memo: Собрать фидбеки', ActionsEnum.GET_FEEDBACK_ABOUT_WORK));
				// }

				blocks.push(button(':information_source: Справка', ActionsEnum.REFERENCE));
				if (user.SPStatus !== SoloProprietorStatus.SOLO_PROPRIETOR) {
					blocks.push(
						// @ts-ignore
						divider(),
						mkdown(
							messageFormat(
								':moneybag: :airplane: *` Тебе {days, plural, one {доступен} few {доступно} many {доступно} other {}} {days} {days, plural, one {отпускной день} few {отпускных дня} many {отпускных дней} other {}} `*',
								{ days }
							)
						)
					);
				}

				await views.publish({
					user_id: user.slackId,
					view: {
						type: 'home',
						blocks: [...blocks, ...otherBlock],
					},
				});
				return;
			} else {
				await views.publish({
					user_id: user.slackId,
					view: {
						type: 'home',
						blocks: [
							mkdown(
								`*:wave: Привет, <@${user.slackId}>! Я ` +
									(process.env.ADMINJS_TEXT_LOGO || 'UIT Bot') +
									', готов помочь тебе. С чего начнем?*'
							),
							button(':gear: Запланировать отгул', ActionsEnum.DAYOFF_PLAN),
							button(':scroll: История', ActionsEnum.HISTORY),
							button(':dancer: Запланированные отгулы', ActionsEnum.PLANNED_DAYOFFS),
							divider(),
						],
					},
				});
				return;
			}
		}

		await views.publish({
			user_id: user.slackId,
			view: {
				type: 'home',
				blocks: [
					mkdown(
						`*<@${user.slackId}>, cпасибо за регистрацию. Твой профиль на проверке. Функции бота станут доступны в скором времени.*`
					),
				],
			},
		});
	}

	@Action(ActionsEnum.SERVICES_MODAL)
	async services({ user, views, ack }: Context): Promise<void> {
		await ack();
		const buttons = [button('Запланировать отгул', ActionsEnum.DAYOFF_PLAN)];

		if (user.SPStatus !== SoloProprietorStatus.SOLO_PROPRIETOR) {
			buttons.push(button('Запланировать отпуск', ActionsEnum.VACATION_PLAN));
		}

		if (!user.SPStatus) {
			buttons.push(button('Продажа отпуска', ActionsEnum.SELL_PLAN));
		}

		await views.publish({
			user_id: user.slackId,
			view: {
				type: 'home',
				blocks: [
					header('Что ты хочешь сделать?'),
					...buttons,
					button('На главную', ActionsEnum.RETURN_HOME),
				],
			},
		});
	}

	@Action(ActionsEnum.REFERENCE)
	async reference({ user, views, ack }: Context): Promise<void> {
		await ack();
		let help: KnownBlock[] = [];
		switch (user.SPStatus) {
			case SoloProprietorStatus.DEFAULT_EMPLOYEE:
				help = employeeHelp(user);
				break;
			case SoloProprietorStatus.SOLO_PROPRIETOR:
				help = IPHelp(user);
				break;
			case SoloProprietorStatus.VIP_SOLO_PROPRIETOR:
				help = VIPIPHelp(user);
				break;
			default:
				help = employeeHelp(user);
				break;
		}
		await views.publish({
			user_id: user.slackId,
			view: {
				type: 'home',
				blocks: [
					header('Справка о приложении UIT Bot.'),
					...help,
					button('Назад', ActionsEnum.RETURN_HOME),
				],
			},
		});
	}
}
