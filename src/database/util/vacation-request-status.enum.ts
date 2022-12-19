export enum VacationRequestStatus {
	CREATED = 'created',
	CREATED_FOR_SELL = 'created-for-sell',
	WAIT_PM = 'wait-pm',
	APPROVED_ALL_PM = 'approved-all-pm',
	HEAD_ONLY_REQUEST = 'head-only-request',
	REJECTED_PM = 'rejected-pm',
	WAIT_HEAD = 'wait-head',
	APPROVED_HEAD = 'approved-head',
	REJECTED_HEAD = 'rejected-head',
	REJECTED_EMPLOYEE = 'rejected-employee',
	ADDED_BY_ADMIN = 'added-by-admin',
	CANCELLED_BY_ADMIN = 'cancelled-by-admin',
	FINISHED = 'finished',
	AUTO_REJECT = 'auto-reject',
}

export const VacationRequestStatusTranslation = [
	{
		value: VacationRequestStatus.CREATED,
		label: 'Создан',
	},
	{
		value: VacationRequestStatus.WAIT_PM,
		label: 'Ожидает одобрения ПМов',
	},
	{
		value: VacationRequestStatus.WAIT_HEAD,
		label: 'Ожидает одобрения руководителя',
	},
	{
		value: VacationRequestStatus.APPROVED_ALL_PM,
		label: 'Одобрен всеми ПМами',
	},
	{
		value: VacationRequestStatus.APPROVED_HEAD,
		label: 'Одобрен руководителем',
	},
	{
		value: VacationRequestStatus.REJECTED_PM,
		label: 'Отклонен ПМом',
	},
	{
		value: VacationRequestStatus.REJECTED_HEAD,
		label: 'Отклонен руководителем',
	},
	{
		value: VacationRequestStatus.REJECTED_EMPLOYEE,
		label: 'Отменен сотрудником',
	},
	{
		value: VacationRequestStatus.HEAD_ONLY_REQUEST,
		label: 'Запрос без ПМов',
	},
	{
		value: VacationRequestStatus.FINISHED,
		label: 'Завершен',
	},
	{
		value: VacationRequestStatus.ADDED_BY_ADMIN,
		label: 'Добавлен администратором',
	},
	{
		value: VacationRequestStatus.CANCELLED_BY_ADMIN,
		label: 'Отменен администратором',
	},
	{
		value: VacationRequestStatus.AUTO_REJECT,
		label: 'Отменен автоматически',
	},
];

export const VacationRequestStatusAllowedForCanceled = [
	VacationRequestStatus.CREATED,
	VacationRequestStatus.WAIT_PM,
	VacationRequestStatus.WAIT_HEAD,
	VacationRequestStatus.APPROVED_ALL_PM,
	VacationRequestStatus.APPROVED_HEAD,
	VacationRequestStatus.HEAD_ONLY_REQUEST,
	VacationRequestStatus.FINISHED,
	VacationRequestStatus.ADDED_BY_ADMIN,
];
