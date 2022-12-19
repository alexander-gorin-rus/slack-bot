import { Test, TestingModule } from '@nestjs/testing';
import { HomeController } from './home.controller';
import assert from 'assert';
import { mkdown } from '../templates/mkdown';
import { Employee } from '../database/entity/employee.entity';
import { mock } from '../slack-bot/test/mock';
import { HelperService } from '../main/helper.service';
import { VacationRequestService } from '../database/service/vacation-request.service';
import { WebClient } from '@slack/web-api';
import { DayoffRequestService } from '../database/service/dayoff-request.service';
import { SellRequestService } from '../database/service/sell.service';
import { ProdCalendarService } from '../database/service/production-calendar.service';
import { EmployeeService } from '../database/service/employee.service';
import { header } from '../templates/header';
import { button } from '../templates/button';
import { ActionsEnum } from '../configs/actions';

describe('HomeController', () => {
	let controller: HomeController;
	const stubRequests = {
		dayoff: { count: 0, list: [] },
		sell: { count: 0, list: [] },
		vacation: { count: 0, list: [] },
	};

	const createEmployee = (slackId: string, days: number, active?: boolean): Employee => {
		const user = new Employee();
		user.slackId = slackId;
		user.days = days;
		user.active = active !== false;
		return user;
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [HomeController],
			providers: [
				HelperService,
				{ provide: WebClient, useValue: {} },
				{
					provide: DayoffRequestService,
					useValue: {
						// eslint-disable-next-line require-await
						count: async () => stubRequests.dayoff.count,
						// eslint-disable-next-line require-await
						findDayoffRequests: async () => stubRequests.dayoff.list,
					},
				},
				{
					provide: VacationRequestService,
					useValue: {
						// eslint-disable-next-line require-await
						count: async () => stubRequests.vacation.count,
						// eslint-disable-next-line require-await
						findVacationRequests: async () => stubRequests.vacation.list,
					},
				},
				{
					provide: SellRequestService,
					useValue: {
						// eslint-disable-next-line require-await
						count: async () => stubRequests.sell.count,
						// eslint-disable-next-line require-await
						findFinished: async () => stubRequests.sell.list,
					},
				},
				{ provide: ProdCalendarService, useValue: {} },
				{ provide: EmployeeService, useValue: {} },
			],
			imports: [],
		}).compile();

		controller = module.get<HomeController>(HomeController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	it('Home page for inactive user', async () => {
		const user = createEmployee('rexx', 30, false);
		const { views, publishParam } = mock();
		// @ts-ignore
		await controller.home({ user, views });
		assert.equal(publishParam.user_id, user.slackId);
		expect(publishParam.view.blocks).toHaveLength(1);
		assert.deepEqual(
			publishParam.view.blocks[0],
			mkdown(
				'*<@rexx>, cпасибо за регистрацию. Твой профиль на проверке. Функции бота станут доступны в скором времени.*'
			)
		);
	});

	it('Home page for active user without actions', async () => {
		const user = createEmployee('rexx', 4.666666);
		const { views, publishParam } = mock();
		// @ts-ignore
		await controller.home({ user, views });
		assert.equal(publishParam.user_id, user.slackId);
		assert.deepEqual(
			publishParam.view.blocks[0],
			mkdown(
				'*:wave: Привет, <@rexx>! Я ' +
					(process.env.ADMINJS_TEXT_LOGO || 'UIT Bot') +
					', готов помочь тебе. С чего начнем?*'
			)
		);
		assert.deepEqual(
			publishParam.view.blocks[4],
			mkdown(':moneybag: :airplane: *` Тебе доступно 4 отпускных дня `*')
		);
	});

	it('Home page for active user with sell actions', async () => {
		const user = createEmployee('rexx', 4.666666);
		const { views, publishParam } = mock();
		stubRequests.sell.count = 1;
		stubRequests.sell.list = [{}];
		// @ts-ignore
		await controller.home({ user, views });
		stubRequests.sell.count = 0;
		stubRequests.sell.list = [];
		assert.deepEqual(
			publishParam.view.blocks[3],
			button(':moneybag: Запланированные продажи', ActionsEnum.PLANNED_SELLS)
		);
		assert.deepEqual(
			publishParam.view.blocks[6],
			mkdown(':moneybag: :airplane: *` Тебе доступно 4 отпускных дня `*')
		);
	});

	it('Home page for active user with vacation actions', async () => {
		const user = createEmployee('rexx', 4.666666);
		const { views, publishParam } = mock();
		stubRequests.vacation.count = 1;
		stubRequests.vacation.list = [{}];
		// @ts-ignore
		await controller.home({ user, views });
		stubRequests.vacation.count = 0;
		stubRequests.vacation.list = [];
		assert.deepEqual(
			publishParam.view.blocks[3],
			button(':airplane: Запланированные отпуска', ActionsEnum.PLANNED_VACATIONS)
		);
		assert.deepEqual(
			publishParam.view.blocks[6],
			mkdown(':moneybag: :airplane: *` Тебе доступно 4 отпускных дня `*')
		);
	});

	it('Home page for active user with dayoff actions', async () => {
		const user = createEmployee('rexx', 4.666666);
		const { views, publishParam } = mock();
		stubRequests.dayoff.count = 1;
		stubRequests.dayoff.list = [{}];
		// @ts-ignore
		await controller.home({ user, views });
		stubRequests.dayoff.count = 0;
		stubRequests.dayoff.list = [];
		assert.deepEqual(
			publishParam.view.blocks[3],
			button(':dancer: Запланированные отгулы', ActionsEnum.PLANNED_DAYOFFS)
		);
		assert.deepEqual(
			publishParam.view.blocks[6],
			mkdown(':moneybag: :airplane: *` Тебе доступно 4 отпускных дня `*')
		);
	});

	it('Service page', async () => {
		const user = createEmployee('rexx', 4.666666);
		const { views, publishParam, ack } = mock();
		// @ts-ignore
		await await controller.services({ user, views, ack });
		assert.equal(publishParam.user_id, user.slackId);
		assert.deepEqual(publishParam.view.blocks[0], header('Что ты хочешь сделать?'));
	});

	it('Information page', async () => {
		const user = createEmployee('rexx', 4.666666);
		user.vacationDaysPerMonth = 2.66;
		const { views, publishParam, ack } = mock();
		// @ts-ignore
		await await controller.reference({ user, views, ack });
		assert.equal(publishParam.user_id, user.slackId);
		assert.deepEqual(publishParam.view.blocks[0], header('Справка о приложении UIT Bot.'));
	});
});
