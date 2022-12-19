/* eslint-disable require-await */
import AdminJS, { ActionResponse, ResourceOptions, ValidationError } from 'adminjs';
import { Employee } from '../../database/entity/employee.entity';
import { SellRequest } from '../../database/entity/sell.entity';
import {
	SellRequestStatus,
	SellRequestStatusTranslation,
	SellRequestStatusAllowedForCanceled,
} from '../../database/util/sell-request-status.enum';
import { SellRequestService } from '../../database/service/sell.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { messageFormat } from '../../utils';
import { NodeMailerService } from '../../main/nodemailer.service';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import { getKafkaDaysChangeData } from '../../kafka/utils/tranformers';
import { VacationDayChange } from '../../database/entity/vacation-day-change.entity';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../../database/util/vacation-day-change-type-of-initiatior.enum';
import { Messages } from '../../main/messages.service';
import { CalendarService } from '../../calendar/calendar.service';
import { ProdCalendarService } from '../../database/service/production-calendar.service';
import { ProductionCalendar } from '../../database/entity/production-calendar.entity';
import { addDays, format_yyyy_mm_dd } from '../../lib/functions';

const initSellResource = (
	mailer: NodeMailerService,
	kafkaService: KafkaService,
	messages: Messages
): ResourceOptions => {
	return {
		parent: {
			name: 'Отпуска/Отгулы',
		},
		sort: {
			direction: 'desc',
			sortBy: 'id',
		},
		actions: {
			new: {
				before: async (request) => {
					validateInput(request.payload);
					const from = new Date(request.payload.from);

					request.payload.to = format_yyyy_mm_dd(addDays(from, request.payload.days));

					request.payload.status = SellRequestStatus.ADDED_BY_ADMIN;

					const employee = await Employee.getRepository().findOne({
						where: { id: request.payload.employeeId },
						relations: ['head'],
					});

					const sellRequestsService = new SellRequestService(SellRequest.getRepository());
					const vacationRequestService = new VacationRequestService(
						VacationRequest.getRepository(),
						new CalendarService(new ProdCalendarService(ProductionCalendar.getRepository()))
					);

					const crossSell = await sellRequestsService.findCrossingRequest(
						employee,
						request.payload.from,
						request.payload.to
					);
					const crossVacantionCompleated = await vacationRequestService.findCrossingRequest(
						employee,
						request.payload.from,
						request.payload.to,
						'completed'
					);
					const crossVacantionAwait = await vacationRequestService.findCrossingRequest(
						employee,
						request.payload.from,
						request.payload.to,
						'await'
					);

					if (crossSell.length) {
						throw new ValidationError(
							{
								dayOff: {
									message: messageFormat(
										'Продажа уже назначена с {from, date, long} по {to, date, long} Выбери другой день для продажи.',
										crossSell[0]
									),
								},
							},
							{
								message: messageFormat(
									'Продажа уже назначена с {from, date, long} по {to, date, long} Выбери другой день для продажи.',
									crossSell[0]
								),
							}
						);
					}

					if (crossVacantionCompleated.length || crossVacantionAwait.length) {
						throw new ValidationError(
							{
								dayOff: {
									message: messageFormat(
										'Отпуск уже назначен с {from, date, long} по {to, date, long} Выбери другой день для продажи.',
										crossVacantionCompleated[0] || crossVacantionAwait[0]
									),
								},
							},
							{
								message: messageFormat(
									'Отпуск уже назначен с {from, date, long} по {to, date, long} Выбери другой день для продажи.',
									crossVacantionCompleated[0] || crossVacantionAwait[0]
								),
							}
						);
					}

					mailer.send([], 'sellDaysFinDep', {
						request: { employee },
						from: messageFormat('{from , date, long}', {
							from: request.payload.from,
						}),
						to: messageFormat('{to , date, long}', { to: request.payload.to }),
						shortDays: messageFormat(
							'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
							{ days: request.payload.days }
						),
						days: messageFormat(
							'{days} {days, plural, one {календарный день} few {календарных дня} many {календарных дней} other {}}',
							{ days: request.payload.days }
						),
					});

					mailer.send(employee.email, 'sellDaysEmployee', {
						request: { employee },
						from: messageFormat('{from , date, long}', {
							from: request.payload.from,
						}),
						to: messageFormat('{to , date, long}', { to: request.payload.to }),
						shortDays: messageFormat(
							'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
							{ days: request.payload.days }
						),
					});

					return request;
				},
				after: async (response: ActionResponse) => {
					const sellRequest = await SellRequest.getRepository().findOne({
						where: { id: response.record.params.id },
						relations: ['employee', 'employee.head'],
					});

					const changeRepository = VacationDayChange.getRepository();
					const vacationChange = new VacationDayChange();
					vacationChange.globalId = sellRequest.globalId;
					vacationChange.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_SALE_ADMIN;
					vacationChange.days = -sellRequest.days;
					vacationChange.employee = sellRequest.employee;
					vacationChange.reason = messages(
						'Оформлена продажа отпуска на {days} {days, plural, one {дня} few {дней} many {дней} other {}} администратором',
						{ days: vacationChange.days }
					);
					await changeRepository.save(vacationChange);

					kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(vacationChange));

					return response;
				},
			},
			edit: { isAccessible: false },
			show: { isAccessible: true },
			delete: { isAccessible: false },
			cancelSell: {
				actionType: 'record',
				handler: async (request, response, context) => {
					const user = context.record;
					return {
						record: user.toJSON(context.currentAdmin),
					};
				},
				component: AdminJS.bundle('../components/cancel-sell.tsx'),
				isAccessible: ({ record: { params: { status = '' } = {} } = {} }) => {
					return SellRequestStatusAllowedForCanceled.includes(status);
				},
			},
			export: {
				actionType: 'resource',
				isVisible: true,
				isAccessible: true,
				handler: async (request, response, context) => {
					return context;
				},
				component: AdminJS.bundle('../components/csv-export.tsx'),
			},
		},
		listProperties: ['createdAt', 'id', 'employeeId', 'days', 'from', 'to', 'status'],
		showProperties: ['id', 'employeeId', 'from', 'to', 'days'],
		filterProperties: ['id', 'employeeId', 'from', 'to', 'days'],
		editProperties: ['employeeId', 'from', 'days', 'reason'],
		properties: {
			id: {
				isDisabled: true,
			},
			employeeId: {
				position: 1,
				isRequired: true,
				isTitle: false,
			},
			from: {
				position: 2,
				isRequired: true,
				components: {
					edit: AdminJS.bundle('../components/custom-date-time-filter.tsx'),
				},
			},
			days: {
				position: 3,
				type: 'number',
				isRequired: true,
			},
			reason: {
				position: 4,
				isRequired: true,
			},
			createdAt: {
				components: {
					filter: AdminJS.bundle('../components/custom-date-time-filter.tsx'),
				},
			},
			to: {
				components: {
					filter: AdminJS.bundle('../components/custom-date-time-filter.tsx'),
				},
			},
			status: {
				availableValues: SellRequestStatusTranslation,
			},
		},
	};
};

function validateInput(payload) {
	if (!payload.employeeId) {
		throw new ValidationError(
			{
				employeeId: {
					message: 'Заполните это поле.',
				},
			},
			{ message: 'ФИ сотрудника не может быть пустым' }
		);
	}

	if (!payload.from) {
		throw new ValidationError(
			{
				from: {
					message: 'Заполните это поле.',
				},
			},
			{ message: 'Дата начала отпуска не может быть пустым' }
		);
	}

	if (payload.days <= 0) {
		throw new ValidationError(
			{
				days: {
					message: 'Количество дней отпуска не может быть меньше 1.',
				},
			},
			{ message: 'Количество дней отпуска не может быть меньше 1.' }
		);
	}

	if (payload.days % 1 != 0) {
		throw new ValidationError(
			{
				employeeId: {
					message: 'Допустимы только целочисленные значения.',
				},
			},
			{ message: 'Количество дней продажи отпуска не может быть дробным числом' }
		);
	}

	if (!payload.reason) {
		throw new ValidationError(
			{
				from: {
					message: 'Заполните это поле.',
				},
			},
			{ message: 'Причина продажи отпуска не может быть пустой.' }
		);
	}
}

export const SellRequestResources = (
	mailer: NodeMailerService,
	kafkaService: KafkaService,
	messages: Messages
) => ({
	resource: SellRequest,
	options: initSellResource(mailer, kafkaService, messages),
});
