/* eslint-disable require-await */
import { Module } from '@nestjs/common';
import express, { Application } from 'express';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { verify } from 'argon2';
import { AdminService } from '../database/service/admin.service';
import { Database } from '@adminjs/typeorm';
import { Resource } from '../database/util/Resource';
import { AdminLogService } from '../database/service/admin-log.service';
import { validate } from 'class-validator';
import { Connection } from 'typeorm';
import { DatabaseModule } from '../database/database.module';
import { NodeMailerService } from '../main/nodemailer.service';
import { MainModule } from '../main/main.module';
import { EmployeeResource } from './resources/employeeResource';
import { VacationRequestResource } from './resources/vacationRequestResource';
import { DayoffRequestResources } from './resources/dayoffRequestResource';
import { SellRequestResources } from './resources/sellRequestResource';
import { VacationDayChangeResource } from './resources/vacationDayChangeResource';
import { AdminResource } from './resources/adminResource';
import { AdminLogResource } from './resources/adminLogResource';
import { EmailTemplateResource } from './resources/emailTemplateResource';
import { ProductionCalendarResource } from './resources/productionCalendarResource';
import vacationRouter from './routes/vacation.route';
import employeeRouter from './routes/employee.route';
import sellRouter from './routes/sell.route';
import dayoffRouter from './routes/dayoff.route';
import { PositionResource } from './resources/positionResource';
import { KafkaService } from '../kafka/kafka.service';
import { Messages } from '../main/messages.service';
// import { FeedbackQuestionResource } from './resources/feedbackQuestionResource';

@Module({
	imports: [DatabaseModule, MainModule],
	providers: [
		{
			provide: 'express',
			useFactory: () => {
				return express();
			},
		},
		{
			provide: AdminJS,
			useFactory: AdminModule.initAdminJS,
			inject: [
				'express',
				AdminService,
				AdminLogService,
				Connection,
				NodeMailerService,
				KafkaService,
				Messages,
			],
		},
	],
})
export class AdminModule {
	static initAdminJS(
		app: Application,
		adminService: AdminService,
		adminLogService: AdminLogService,
		connection: Connection,
		mailer: NodeMailerService,
		kafkaService: KafkaService,
		messages: Messages
	) {
		Resource.validate = validate;
		Resource.setConnection(connection);

		// @ts-ignore
		AdminJS.registerAdapter({ Database, Resource });
		AdminJS.ACTIONS.show.isAccessible = () => false;
		AdminJS.ACTIONS.bulkDelete.isAccessible = () => false;

		AdminJS.ACTIONS.edit.after = (...args) => adminLogService.createLog(...args);
		AdminJS.ACTIONS.delete.after = (...args) => adminLogService.createLog(...args);
		AdminJS.ACTIONS.new.after = (...args) => adminLogService.createLog(...args);

		const adminJs = new AdminJS({
			branding: {
				logo: false,
				favicon: '/favicon.svg',
				softwareBrothers: false,
				companyName: process.env.ADMINJS_TEXT_LOGO || 'UIT Bot',
				theme: {
					colors: {
						bg: process.env.ADMINJS_BG_COLOR || '#F6F7FB',
						primary100: process.env.ADMINJS_BTN_COLOR || '#4268F6',
					},
				},
			},
			assets: {
				styles: ['/css/style.css'],
			},
			dashboard: {
				component: AdminJS.bundle('./components/dashboard.tsx'),
			},
			rootPath: '/',
			resources: [
				EmployeeResource,
				VacationRequestResource(mailer, kafkaService, messages),
				DayoffRequestResources(mailer, kafkaService),
				SellRequestResources(mailer, kafkaService, messages),
				VacationDayChangeResource(kafkaService),
				// FeedbackQuestionResource, disabled in this version
				AdminResource(mailer, adminService),
				AdminLogResource,
				EmailTemplateResource,
				ProductionCalendarResource,
				PositionResource,
			],
			locale: {
				language: 'ru',
				translations: {
					messages: {
						loginWelcome: '',
						invalidCredentials: 'Введен неправильный email или пароль',
						errorFetchingRecords:
							'Ошибка сервера, сообщите о ней разработчикам. Подробности в консоле',
						errorFetchingRecord:
							'Ошибка сервера, сообщите о ней разработчикам. Подробности в консоле',
						noRecordsInResource: 'Не найдено ни одной записи',
						noRecords: 'Нет записей',
					},
					labels: {
						Employee: 'Сотрудники',
						VacationRequest: 'Запросы на отпуск',
						DayoffRequest: 'Запросы на отгул',
						SellRequest: 'Продажа отпуска',
						VacationDayChange: 'Начисление дней отпуска',
						// FeedbackQuestion: 'Список вопросов', // disabled in this version
						Admin: 'Администраторы',
						AdminLog: 'Журнал действий',
						EmailTemplate: 'Шаблоны имейлов',
						navigation: 'Навигация',
						pages: 'Страницы',
						selectedRecords: 'Выбрано ({{selected}})',
						filters: 'Фильтры',
						loginWelcome:
							'Добро пожаловать в админ-панель ' + process.env.ADMINJS_TEXT_LOGO || 'UIT Bot' + '!',
						ProductionCalendar: 'Производственный календарь',
					},
					buttons: {
						filter: 'Поиск',
						save: 'Сохранить',
						delete: 'Удалить',
						applyChanges: 'Применить изменения',
						resetFilter: 'Сбросить',
						confirmRemovalMany: 'Подтвердить удаление {{count}} записей',
						confirmRemovalMany_plural: 'Подтвердить удаление {{count}} записей',
						logout: 'Выйти',
						login: 'Войти',
					},
					actions: {
						new: 'Добавить',
						delete: 'Удалить',
					},
					// Translation of properties, actions separately for an object
					resources: {
						Employee: {
							properties: {
								realNameRu: 'ФИ (рус)',
								email: 'Email',
								days: 'Дней отпуска',
								headId: 'ФИ руководителя',
								pmApprove: 'Требуется одобрение ПМа',
								isHR: 'Сотрудник отдела HR',
								isPm: 'Сотрудник является ПМом',
								city: 'Город',
								position: 'Должность',
								firstDay: 'Дата начала работы',
								active: 'Активирован',
								createdAt: 'Дата/Время',
								vacationDaysPerMonth: 'Дней отпуска в месяц',
								hasNoVacataionDays: 'Не участвует в системе начисления отпуска',
								isLPR: 'Лицо, принимающее решение',
								SPStatus: 'Вид сотрудничества',
							},
							actions: {
								list: 'Список сотрудников',
								edit: 'Редактирование профиля',
								save: 'Сохранить',
								vacationDayChanges: 'Изменить кол-во дней отпуска',
								vacationRequestList: 'Запросы на отпуск',
								dayoffRequestList: 'Запросы на отгул',
								sellList: 'Продажи дней отпуска',
							},
						},
						VacationRequest: {
							properties: {
								id: 'ID запроса',
								status: 'Статус',
								createdAt: 'Создан',
								from: 'Дата начала отпуска',
								to: 'Конец отпуска',
								days: 'Длительность отпуска',
								employeeId: 'Сотруник',
								pm: 'ПМ-ы',
								reason: ' Указание причины добавления отпуска',
							},
							actions: {
								edit: 'Редактирование',
								list: 'Запросы на отпуск',
								show: 'Детали',
								new: 'Добавить отпуск',
								export: 'Скачать отчет',
								cancelVacation: 'Отменить отпуск',
							},
						},
						DayoffRequest: {
							properties: {
								id: 'ID запроса',
								status: 'Статус',
								createdAt: 'Создан',
								from: 'Дата начала отгула',
								days: 'Длительность отгула',
								to: 'Конец отгула',
								workingOff: 'Планируется отрабатывать',
								reason: 'Причина',
								employeeId: 'Сотрудник',
								pm: 'ПМ-ы',
							},
							actions: {
								new: 'Добавить отгул',
								edit: 'Редактирование',
								list: 'Запросы на отгул',
								show: 'Детали',
								export: 'Скачать отчет',
								cancelDayOff: 'Отменить отгул',
							},
						},
						SellRequest: {
							properties: {
								id: 'ID запроса',
								createdAt: 'Создан',
								from: 'Дата начала продажи',
								days: 'Число продаваемых дней',
								to: 'Конец продажи',
								employeeId: 'Сотрудник',
								reason: 'Причина добавление продажи',
								status: 'Статус',
							},
							actions: {
								new: 'Добавить продажу',
								edit: 'Редактирование',
								list: 'Продажа отпуска',
								show: 'Детали',
								export: 'Скачать отчет',
								cancelSell: 'Отменить продажу',
							},
						},
						VacationDayChange: {
							properties: {
								id: ' ID операции',
								createdAt: 'Дата/Время записи',
								days: 'Число дней',
								reason: 'Причина',
								employeeId: 'Сотрудник',
								calculatedMonth: 'Месяц начисления',
							},
							actions: {
								list: 'Журнал начислений',
							},
						},
						// disabled in this version
						// FeedbackQuestion: {
						// 	properties: {
						// 		id: 'ID вопроса',
						// 		order: 'Номер',
						// 		text: 'Вопрос',
						// 		active: 'Активный',
						// 		required: 'Обязательный',
						// 		placeholder: 'Пример (максимум 150 символов)',
						// 	},
						// 	actions: {
						// 		edit: 'Редактирование',
						// 		list: 'Список вопросов',
						// 		delete: 'Удалить',
						// 	},
						// },
						Admin: {
							properties: {
								name: 'ФИ администратора',
								id: 'ID администратора',
								active: 'Разрешена авторизация',
								password: 'Пароль',
								employeeId: 'Привязанный сотрудник',
							},
							actions: {
								edit: 'Редактирование',
								list: 'Администраторы',
								changePassword: 'Смена пароля',
							},
						},
						AdminLog: {
							properties: {
								id: 'ID записи',
								createdAt: 'Дата/Время',
								adminId: 'ФИ администратора',
								resource: 'Страница',
								record: 'ID на странице',
								action: 'Действие',
							},
							actions: {
								show: 'Детали',
								list: 'Журнал действий',
							},
						},
						EmailTemplate: {
							properties: {
								subject: 'Тема письма',
								name: 'Имя шаблона',
								id: 'Номер',
								code: 'Код письма',
								template: 'Шаблон письма',
							},
							actions: {
								edit: 'Редактирование',
								list: 'Список шаблонов',
								editor: 'Редактирование',
							},
						},
						ProductionCalendar: {
							properties: {
								year: 'Год',
								active: 'Настроен',
							},
							actions: {
								new: 'Добавить год',
								delete: 'Удалить',
								list: 'Производственный календарь',
								editCalendar: 'Календарь',
							},
						},
					},
				},
			},
		});

		const router = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
			authenticate: async (email, password) => {
				const admin = await adminService.findOne({ email });
				if (admin && admin.active) {
					if (await verify(admin.password, password)) {
						return admin;
					}
				}
				return false;
			},
			cookieName: 'auth',
			cookiePassword: 'auth-secret-password',
		});

		app.use(express.static('public'));
		app.use(adminJs.options.rootPath, router);

		app.use('/api', vacationRouter);
		app.use('/api', employeeRouter);
		app.use('/api', sellRouter);
		app.use('/api', dayoffRouter);
		app.use((request, response, next) => {
			response.locals.mailer = mailer;
			next();
		});

		return adminJs;
	}

	static initEmailResource() {
		return {
			properties: {
				emailTemplate: {
					props: {
						isMulti: true,
					},
				},
			},
		};
	}
}
