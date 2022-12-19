export enum DayoffRequestStatus {
	CREATED = 'created',
	WAIT_PM = 'wait-pm',
	APPROVED_ALL_PM = 'approved-all-pm',
	REJECTED_PM = 'rejected-pm',
	WAIT_HEAD = 'wait-head',
	APPROVED_HEAD = 'approved-head',
	REJECTED_HEAD = 'rejected-head',
	HEAD_ONLY_REQUEST = 'head-only-request',
	REJECTED_EMPLOYEE = 'rejected-employee',
	FINISHED = 'finished',
	ADDED_BY_ADMIN = 'added-by-admin',
	CANCELLED_BY_ADMIN = 'cancelled-by-admin',
	AUTO_REJECT = 'auto-reject',
}

export const DayoffRequestStatusTranslation = [
	{
		value: DayoffRequestStatus.CREATED,
		label: 'Создан',
	},
	{
		value: DayoffRequestStatus.WAIT_PM,
		label: 'Ожидает одобрения ПМов',
	},
	{
		value: DayoffRequestStatus.WAIT_HEAD,
		label: 'Ожидает одобрения руководителя',
	},
	{
		value: DayoffRequestStatus.APPROVED_ALL_PM,
		label: 'Одобрен всеми ПМами',
	},
	{
		value: DayoffRequestStatus.APPROVED_HEAD,
		label: 'Одобрен руководителем',
	},
	{
		value: DayoffRequestStatus.REJECTED_PM,
		label: 'Отклонен ПМом',
	},
	{
		value: DayoffRequestStatus.REJECTED_HEAD,
		label: 'Отклонен руководителем',
	},
	{
		value: DayoffRequestStatus.REJECTED_EMPLOYEE,
		label: 'Отменен сотрудником',
	},
	{
		value: DayoffRequestStatus.HEAD_ONLY_REQUEST,
		label: 'Запрос без ПМов',
	},
	{
		value: DayoffRequestStatus.FINISHED,
		label: 'Завершено',
	},
	{
		value: DayoffRequestStatus.ADDED_BY_ADMIN,
		label: 'Добавлено администратором',
	},
	{
		value: DayoffRequestStatus.CANCELLED_BY_ADMIN,
		label: 'Отменено администратором',
	},
	{
		value: DayoffRequestStatus.AUTO_REJECT,
		label: 'Отменен автоматически',
	},
];

export const DayOffRequestStatusesAllowedForCanceled = [
	DayoffRequestStatus.CREATED,
	DayoffRequestStatus.WAIT_PM,
	DayoffRequestStatus.WAIT_HEAD,
	DayoffRequestStatus.APPROVED_ALL_PM,
	DayoffRequestStatus.APPROVED_HEAD,
	DayoffRequestStatus.HEAD_ONLY_REQUEST,
	DayoffRequestStatus.FINISHED,
	DayoffRequestStatus.ADDED_BY_ADMIN,
];
