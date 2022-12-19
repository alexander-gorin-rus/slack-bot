/* eslint-disable require-await */
import AdminJS, { ResourceOptions } from 'adminjs';
import { AdminValidator } from '../admin.validator';
import { Employee } from '../../database/entity/employee.entity';
import { SoloProprietorStatus } from '../../database/util/employee-solo-proprietor-status.enum';

const initEmployeeResource = (): ResourceOptions => {
	const employeeFirstDayMinDate = 1199197938000;
	return {
		parent: {
			name: 'Отпуска/Отгулы',
		},
		listProperties: ['realNameRu', 'email', 'days', 'headId'],
		filterProperties: [
			'realNameRu',
			'email',
			'slackId',
			'headId',
			'SPStatus',
			'vacationDaysPerMonth',
			'firstDay',
			'vacationDaysPerMonth',
			'isHR',
			'isPm',
			'active',
			'hasNoVacataionDays',
			'isLPR',
		],
		properties: {
			days: {
				isDisabled: true,
			},
			realNameRu: {
				isTitle: true,
				isRequired: true,
			},
			email: {
				isRequired: true,
				isTitle: false,
			},
			firstDay: {
				isRequired: true,
				props: {
					minDate: employeeFirstDayMinDate,
					showYearDropdown: true,
					scrollableYearDropdown: true,
					showMonthDropdown: true,
				},
				components: {
					edit: AdminJS.bundle('../components/custom-date-time-filter.tsx'),
				},
			},
			slackId: {
				isRequired: true,
			},
			headId: {
				isRequired: true,
				components: {
					edit: AdminJS.bundle('../components/custom-select-head.tsx'),
				},
			},
			SPStatus: {
				isRequired: false,
				availableValues: [
					{ value: 0, label: 'Обычный сотрудник' },
					{ value: 1, label: 'Внештатный сотрудник' },
					{ value: 2, label: 'Внештатный сотрудник с особым отпуском' },
				],
			},
			vacationDaysPerMonth: {
				isRequired: false,
				type: 'float',
			},
			createdAt: {
				components: {
					filter: AdminJS.bundle('../components/custom-date-time-filter.tsx'),
				},
			},
			active: {
				components: {
					filter: AdminJS.bundle('../components/custom-select-filter.tsx'),
				},
			},
			hasNoVacataionDays: {
				components: {
					filter: AdminJS.bundle('../components/custom-select-filter.tsx'),
				},
			},
			isPm: {
				components: {
					filter: AdminJS.bundle('../components/custom-select-filter.tsx'),
				},
			},
			isLPR: {
				components: {
					filter: AdminJS.bundle('../components/custom-select-filter.tsx'),
				},
			},
		},

		editProperties: [
			'realNameRu',
			'email',
			'slackId',
			'headId',
			'SPStatus',
			'vacationDaysPerMonth',
			'firstDay',
			'days',
			'vacationDaysPerMonth',
			'isHR',
			'isPm',
			'active',
			'hasNoVacataionDays',
			'isLPR',
		],
		actions: {
			edit: {
				actionType: 'record',
				before: async (request) => {
					const minDate = AdminValidator.minYear('firstDay');
					const requiredFields = [
						AdminValidator.requiredField('realNameRu'),
						AdminValidator.requiredField('slackId'),
						AdminValidator.requiredField('firstDay'),
						AdminValidator.requiredField('email'),
						AdminValidator.requiredField('headId'),
					];
					if (request.method === 'post') {
						minDate(request);
						AdminValidator.invoker(request, requiredFields);
					}

					request.payload.vacationDaysPerMonth = formatVacationDaysPerMonth(
						Number(request.payload.SPStatus),
						Number(request.payload.vacationDaysPerMonth)
					);

					return request;
				},
			},
			new: {
				isVisible: false,
				before: async (request) => {
					const minDate = AdminValidator.minYear('firstDay');
					const requiredFields = [
						AdminValidator.requiredField('realNameRu'),
						AdminValidator.requiredField('slackId'),
						AdminValidator.requiredField('firstDay'),
						AdminValidator.requiredField('email'),
						AdminValidator.requiredField('headId'),
					];
					if (request.method === 'post') {
						minDate(request);
						AdminValidator.invoker(request, requiredFields);
					}
					return request;
				},
				isAccessible: true,
			},
			delete: {
				isAccessible: false,
			},
			vacationDayChanges: {
				actionType: 'record',
				icon: 'View',
				isVisible: true,
				handler: async (request, response, context) => {
					const user = context.record;
					return {
						record: user.toJSON(context.currentAdmin),
					};
				},
				component: AdminJS.bundle('../components/vacation-day-changes.tsx'),
			},
			vacationRequestList: {
				actionType: 'record',
				icon: 'View',
				isVisible: true,
				handler: async (request, response, context) => {
					const user = context.record;
					return {
						record: user.toJSON(context.currentAdmin),
					};
				},
				component: AdminJS.bundle('../components/vacation-request-list.tsx'),
			},
			dayoffRequestList: {
				actionType: 'record',
				icon: 'View',
				isVisible: true,
				handler: async (request, response, context) => {
					const user = context.record;
					return {
						record: user.toJSON(context.currentAdmin),
					};
				},
				component: AdminJS.bundle('../components/dayoff-request-list.tsx'),
			},
			sellList: {
				actionType: 'record',
				icon: 'View',
				isVisible: true,
				handler: async (request, response, context) => {
					const user = context.record;
					return {
						record: user.toJSON(context.currentAdmin),
					};
				},
				component: AdminJS.bundle('../components/sell-list.tsx'),
			},
		},
	};
};

export const EmployeeResource = {
	resource: Employee,
	options: initEmployeeResource(),
};

function formatVacationDaysPerMonth(
	SPStatus: SoloProprietorStatus,
	currentVacationDaysPerMonth: number
) {
	let result = currentVacationDaysPerMonth;
	if (
		SPStatus === SoloProprietorStatus.DEFAULT_EMPLOYEE &&
		(!currentVacationDaysPerMonth || currentVacationDaysPerMonth < 2.33)
	) {
		result = 2.33;
	}
	if (SPStatus === SoloProprietorStatus.SOLO_PROPRIETOR) {
		result = 0;
	}

	if (SPStatus === SoloProprietorStatus.VIP_SOLO_PROPRIETOR && !currentVacationDaysPerMonth) {
		result = 1.166666666666667;
	}

	return result;
}
