/* eslint-disable require-await */
import AdminJS, {
	ResourceOptions,
	ValidationError,
	ActionResponse,
	ActionRequest,
	ActionContext,
} from 'adminjs';
import { DayoffRequest } from '../../database/entity/dayoff-request.entity';
import { Employee } from '../../database/entity/employee.entity';
import {
	DayoffRequestStatus,
	DayoffRequestStatusTranslation,
	DayOffRequestStatusesAllowedForCanceled,
} from '../../database/util/dayoff-request-status.enum';
import { NodeMailerService } from '../../main/nodemailer.service';
import { messageFormat } from '../../utils';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { VacationRequestService } from '../../database/service/vacation-request.service';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { DayoffRequestConfirm } from '../../database/entity/dayoff-request-confirm.entity';
import { DayoffRequestConfirmStatus } from '../../database/util/dayoff-request-confirm-status.enum';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import { getKafkaEmployeeDayoffCreateOrFinishData } from '../../kafka/utils/tranformers';
import { CalendarService } from '../../calendar/calendar.service';
import { ProdCalendarService } from '../../database/service/production-calendar.service';
import { ProductionCalendar } from '../../database/entity/production-calendar.entity';
import { addDays, format_yyyy_mm_dd } from '../../lib/functions';

const initDayoffRequestResource = (
	mailer: NodeMailerService,
	kafkaService: KafkaService
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
					request.payload.status = DayoffRequestStatus.ADDED_BY_ADMIN;
					if (!request.payload.workingOff) request.payload.workingOff = false;

					const employee = await Employee.getRepository().findOne({
						where: { id: request.payload.employeeId },
						relations: ['head'],
					});

					const dayoffRequestService = new DayoffRequestService(DayoffRequest.getRepository());
					const vacationRequestService = new VacationRequestService(
						VacationRequest.getRepository(),
						new CalendarService(new ProdCalendarService(ProductionCalendar.getRepository()))
					);

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

					if (crossDayoffCompleated.length || crossDayoffAwait.length) {
						throw new ValidationError(
							{
								dayOff: {
									message: messageFormat(
										'Отгул уже назначен с {from, date, long} по {to, date, long} Выбери другой день начала отгула..',
										crossDayoffCompleated[0] || crossDayoffAwait[0]
									),
								},
							},
							{
								message: messageFormat(
									'Отгул уже назначен с {from, date, long} по {to, date, long} Выбери другой день начала отгула..',
									crossDayoffCompleated[0] || crossDayoffAwait[0]
								),
							}
						);
					}

					if (crossVacantionCompleated.length || crossVacantionAwait.length) {
						throw new ValidationError(
							{
								dayOff: {
									message: messageFormat(
										'На эту дату назначен отпуск с {from, date, long} по {to, date, long} Выбери другой день начала отгула.',
										crossVacantionCompleated[0] || crossVacantionAwait[0]
									),
								},
							},
							{
								message: messageFormat(
									'На эту дату назначен отпуск с {from, date, long} по {to, date, long} Выбери другой день начала отгула.',
									crossVacantionCompleated[0] || crossVacantionAwait[0]
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

					pmList.forEach(async (pm: number) => {
						const currentPm = await Employee.getRepository().findOne({
							where: { id: pm },
						});
						emailList.push(currentPm.email);
					});

					if (request.payload.workingOff === 'true') {
						mailer.send([], 'dayoffApproveWithoutOk', {
							request: { employee },
							from: messageFormat('{from , date, long}', {
								from: request.payload.from,
							}),
							to: messageFormat('{to , date, long}', {
								to: request.payload.to,
							}),
							days: messageFormat(
								'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
								{ days: request.payload.days }
							),
							shortDays: messageFormat(
								'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
								{ days: request.payload.days }
							),
						});
					} else {
						mailer.send([], 'dayoffApproveForFinDep', {
							request: { employee },
							from: messageFormat('{from , date, long}', {
								from: request.payload.from,
							}),
							to: messageFormat('{to , date, long}', {
								to: request.payload.to,
							}),
							days: messageFormat(
								'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
								{ days: request.payload.days }
							),
							shortDays: messageFormat(
								'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
								{ days: request.payload.days }
							),
						});
					}

					mailer.send(emailList, 'dayoffApproveForEmployee', {
						request: {
							employee,
							days: request.payload.days,
							reason: request.payload.reason,
							workingOff: request.payload.workingOff === 'true' ? 'Да' : 'Нет',
						},
						from: messageFormat('{from , date, long}', {
							from: request.payload.from,
						}),
						to: messageFormat('{to , date, long}', { to: request.payload.to }),
						shortDays: messageFormat(
							'{days} {days, plural, one {день} few {дня} many {дней} other {}}',
							{ days: request.payload.days }
						),
					});

					request.payload.pmList = pmList;

					return request;
				},
				after: async (response: ActionResponse, request: ActionRequest, context: ActionContext) => {
					request.payload.pmList.forEach(async (pmId) => {
						const dayoffConfirmRequest = new DayoffRequestConfirm();

						dayoffConfirmRequest.status = DayoffRequestConfirmStatus.AUTO_APPROVE;
						dayoffConfirmRequest.dayoffRequest = response.record.params.id;
						dayoffConfirmRequest.manager = pmId;

						await DayoffRequestConfirm.getRepository().save(dayoffConfirmRequest);
					});

					const dayoff = await DayoffRequest.getRepository().findOne({
						where: { id: response.record.params.id },
						relations: ['employee', 'employee.head', 'confirms', 'confirms.manager'],
					});
					const currentAdmin = context.currentAdmin;
					const adminEmployee = await Employee.getRepository().findOne({
						where: { id: currentAdmin.employeeId },
					});

					kafkaService.sendMessage(
						TOPICS_LIST.EMPLOYEE_DAYOFF_CREATED,
						getKafkaEmployeeDayoffCreateOrFinishData(dayoff, adminEmployee)
					);

					return response;
				},
			},
			show: { isAccessible: true },
			edit: { isAccessible: false },
			delete: { isAccessible: false },
			cancelDayOff: {
				actionType: 'record',
				handler: async (request, response, context) => {
					const user = context.record;

					return {
						record: user.toJSON(context.currentAdmin),
					};
				},
				component: AdminJS.bundle('../components/cancel-dayoff.tsx'),
				isAccessible: ({ record: { params: { status = '' } = {} } = {} }) => {
					return DayOffRequestStatusesAllowedForCanceled.includes(status);
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
		showProperties: ['id', 'employeeId', 'from', 'to', 'days', 'reason', 'workingOff', 'status'],
		filterProperties: ['id', 'employeeId', 'from', 'to', 'days', 'reason', 'workingOff', 'status'],
		listProperties: ['createdAt', 'id', 'employeeId', 'days', 'from', 'to', 'status'],
		editProperties: ['employeeId', 'from', 'days', 'workingOff', 'reason', 'pm'],
		properties: {
			employeeId: {
				position: 1,
				isRequired: true,
			},
			from: {
				position: 2,
				type: 'date',
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
			workingOff: {
				position: 4,
				availableValues: [
					{ value: 'true', label: 'Дa' },
					{ value: 'false', label: 'Нет' },
				],
			},
			reason: {
				position: 5,
				isRequired: true,
				type: 'string',
			},
			pm: {
				position: 6,
				components: {
					edit: AdminJS.bundle('../components/multi-select-pm.tsx'),
				},
			},
			to: {
				type: 'date',
				components: {
					filter: AdminJS.bundle('../components/custom-date-time-filter.tsx'),
				},
			},
			status: {
				availableValues: DayoffRequestStatusTranslation,
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
			{ message: 'Количество дней отгула не может быть дробным числом' }
		);
	}

	if (!payload.reason) {
		throw new ValidationError(
			{
				reason: {
					message: 'Заполните это поле.',
				},
			},
			{ message: 'Причина не может быть пустой.' }
		);
	}
}

export const DayoffRequestResources = (mailer: NodeMailerService, kafkaService: KafkaService) => ({
	resource: DayoffRequest,
	options: initDayoffRequestResource(mailer, kafkaService),
});
