/* eslint-disable require-await */
import AdminJS, {
	ResourceOptions,
	ValidationError,
	ActionResponse,
	ActionRequest,
	ActionContext,
} from 'adminjs';
import { messageFormat } from '../../utils';
import { NodeMailerService } from '../../main/nodemailer.service';
import { DayoffRequest } from '../../database/entity/dayoff-request.entity';
import { Employee } from '../../database/entity/employee.entity';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { SellRequestService } from '../../database/service/sell.service';
import {
	VacationRequestStatus,
	VacationRequestStatusTranslation,
	VacationRequestStatusAllowedForCanceled,
} from '../../database/util/vacation-request-status.enum';
import { SellRequest } from '../../database/entity/sell.entity';
import { VacationRequestConfirm } from '../../database/entity/vacation-request-confirm.entity';
import { VacationRequestConfirmStatus } from '../../database/util/vacation-request-confirm-status.enum';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import {
	getKafkaEmployeeVacationCreateOrFinalData,
	getKafkaDaysChangeData,
} from '../../kafka/utils/tranformers';
import { Messages } from '../../main/messages.service';
import { VacationDayChange } from '../../database/entity/vacation-day-change.entity';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../../database/util/vacation-day-change-type-of-initiatior.enum';
import { CalendarService } from '../../calendar/calendar.service';
import { ProdCalendarService } from '../../database/service/production-calendar.service';
import { ProductionCalendar } from '../../database/entity/production-calendar.entity';

const initVacationRequestResource = (
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

					request.payload.to = new Date(from.setDate(from.getDate() + +request.payload.days))
						.toISOString()
						.slice(0, 10);
					request.payload.status = VacationRequestStatus.ADDED_BY_ADMIN;
					const employee = await Employee.getRepository().findOne({
						where: { id: request.payload.employeeId },
						relations: ['head'],
					});

					const dayoffRequestService = new DayoffRequestService(DayoffRequest.getRepository());
					const vacationRequestService = new VacationRequestService(
						VacationRequest.getRepository(),
						new CalendarService(new ProdCalendarService(ProductionCalendar.getRepository()))
					);
					const sellRequestService = new SellRequestService(SellRequest.getRepository());

					const crossDayoffCompleated = await dayoffRequestService.findCrossingRequest(
						employee,
						request.payload.from,
						request.payload.to,
						'completed'
					);
					const crossDayoffAwait = await dayoffRequestService.findCrossingRequest(
						employee,
						request.payload.from,
						request.payload.to,
						'await'
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
					const crossSell = await sellRequestService.findCrossingRequest(
						employee,
						request.payload.from,
						request.payload.to
					);

					if (crossDayoffCompleated.length || crossDayoffAwait.length) {
						throw new ValidationError(
							{
								dayoff: {
									message: messageFormat(
										'На эту дату уже назначен отгул с {from, date, long} по {to, date, long} Выбери другой день начала отпуска.',
										crossDayoffCompleated[0] || crossDayoffAwait[0]
									),
								},
							},
							{
								message: messageFormat(
									'На эту дату уже назначен отгул с {from, date, long} по {to, date, long} Выбери другой день начала отпуска.',
									crossDayoffCompleated[0] || crossDayoffAwait[0]
								),
							}
						);
					}

					if (crossVacantionCompleated.length || crossVacantionAwait.length) {
						throw new ValidationError(
							{
								dayoff: {
									message: messageFormat(
										'На эту дату уже назначен отпуск с {from, date, long} по {to, date, long} Выбери другой день начала отпуска.',
										crossVacantionCompleated[0] || crossVacantionAwait[0]
									),
								},
							},
							{
								message: messageFormat(
									'На эту дату уже назначен отпуск с {from, date, long} по {to, date, long} Выбери другой день начала отпуска.',
									crossVacantionCompleated[0] || crossVacantionAwait[0]
								),
							}
						);
					}

					if (crossSell.length) {
						throw new ValidationError(
							{
								dayoff: {
									message: messageFormat(
										'На эту дату уже назначена продажа с {from, date, long} по {to, date, long} Выбери другой день начала отпуска.',
										crossSell[0]
									),
								},
							},
							{
								message: messageFormat(
									'На эту дату уже назначена продажа с {from, date, long} по {to, date, long} Выбери другой день начала отпуска.',
									crossSell[0]
								),
							}
						);
					}

					const emailList = [employee.email];

					const pmList = [];

					Object.entries(request.payload).forEach(([key]) => {
						if (key.includes('pmList')) {
							if (!Array.isArray(request.payload[key])) {
								pmList.push(request.payload[key]);
								delete request.payload[key];
							}
						}
					});

					if (employee.head) {
						emailList.push(employee.head.email);
					}

					if (pmList.length) {
						for (const pm of pmList) {
							const currentPm = await Employee.getRepository().findOne({
								where: { id: pm },
							});
							emailList.push(currentPm.email);
						}
					}

					mailer.send([], 'vacationApproveForFinDep', {
						request: { employee },
						from: messageFormat('{from , date, long}', {
							from: request.payload.from,
						}),
						shortDays: messageFormat(
							'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
							{ days: request.payload.days }
						),
						to: messageFormat('{to , date, long}', { to: request.payload.to }),
					});

					mailer.send(emailList, 'vacationApproveForEmployee', {
						request: { employee },
						from: messageFormat('{from , date, long}', {
							from: request.payload.from,
						}),
						shortDays: messageFormat(
							'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
							{ days: request.payload.days }
						),
						to: messageFormat('{to , date, long}', { to: request.payload.to }),
					});

					request.payload.pmList = pmList;
					return request;
				},
				after: async (response: ActionResponse, request: ActionRequest, context: ActionContext) => {
					request.payload.pmList.forEach(async (pmId) => {
						const vacationConfirmRequest = new VacationRequestConfirm();

						vacationConfirmRequest.status = VacationRequestConfirmStatus.AUTO_APPROVE;
						vacationConfirmRequest.vacationRequest = response.record.params.id;
						vacationConfirmRequest.manager = pmId;
						await VacationRequestConfirm.getRepository().save(vacationConfirmRequest);
					});

					const vacation = await VacationRequest.getRepository().findOne({
						where: { id: response.record.params.id },
						relations: ['employee', 'employee.head', 'confirms', 'confirms.manager'],
					});
					const currentAdmin = context.currentAdmin;
					const adminEmployee = await Employee.getRepository().findOne({
						where: { id: currentAdmin.employeeId },
					});

					kafkaService.sendMessage(
						TOPICS_LIST.EMPLOYEE_VACATION_CREATED,
						getKafkaEmployeeVacationCreateOrFinalData(vacation, adminEmployee)
					);

					const changeRepository = VacationDayChange.getRepository();
					const vacationChange = new VacationDayChange();
					vacationChange.globalId = vacation.globalId;
					vacationChange.typeOfInitiator =
						VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION_ADMIN;
					vacationChange.days = -vacation.days;
					vacationChange.employee = vacation.employee;
					vacationChange.reason = messages(
						'Оформлен отпуск на {days} {days, plural, one {дня} few {дней} many {дней} other {}} администратором',
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
			cancelVacation: {
				actionType: 'record',
				handler: async (request, response, context) => {
					const user = context.record;

					return {
						record: user.toJSON(context.currentAdmin),
					};
				},
				component: AdminJS.bundle('../components/cancel-vacation.tsx'),
				isAccessible: ({ record: { params: { status = '' } = {} } = {} }) => {
					return VacationRequestStatusAllowedForCanceled.includes(status);
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
		filterProperties: ['id', 'employeeId', 'from', 'to', 'days', 'status'],
		showProperties: ['id', 'employeeId', 'from', 'to', 'days', 'status'],
		editProperties: ['employeeId', 'from', 'days', 'pm', 'reason'],
		properties: {
			id: {
				isDisabled: true,
			},
			employeeId: {
				position: 1,
				isRequired: true,
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
				isRequired: true,
				type: 'number',
			},
			pm: {
				position: 4,
				components: {
					edit: AdminJS.bundle('../components/multi-select-pm.tsx'),
				},
			},
			reason: {
				position: 5,
				isRequired: true,
				type: 'string',
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
				position: 7,
				availableValues: VacationRequestStatusTranslation,
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
			{ message: 'Количество дней отпуска не может быть дробным числом' }
		);
	}
}

export const VacationRequestResource = (
	mailer: NodeMailerService,
	kafkaService: KafkaService,
	messages: Messages
) => ({
	resource: VacationRequest,
	options: initVacationRequestResource(mailer, kafkaService, messages),
});
