export enum SellRequestStatus {
	PLANNED = 'planned',
	AWAITING = 'awaiting',
	REJECTED_EMPLOYEE = 'rejected-employee',
	ADDED_BY_ADMIN = 'added-by-admin',
	CANCELLED_BY_ADMIN = 'cancelled-by-admin',
	FINISHED = 'finished',
	ADDED_WITH_VACATION = 'added-with-vacation',
}

export const SellRequestStatusTranslation = [
	{
		value: SellRequestStatus.PLANNED,
		label: 'Запланирована продажа',
	},
	{
		value: SellRequestStatus.AWAITING,
		label: 'Ожидает одобрения',
	},
	{
		value: SellRequestStatus.REJECTED_EMPLOYEE,
		label: 'Отменен сотрудником',
	},
	{
		value: SellRequestStatus.ADDED_BY_ADMIN,
		label: 'Добавлено администратором',
	},
	{
		value: SellRequestStatus.CANCELLED_BY_ADMIN,
		label: 'Отменено администратором',
	},
	{
		value: SellRequestStatus.FINISHED,
		label: 'Завершено',
	},
	{
		value: SellRequestStatus.ADDED_WITH_VACATION,
		label: 'Допродажа отпуска',
	},
];

export const SellRequestStatusAllowedForCanceled = [
	SellRequestStatus.PLANNED,
	SellRequestStatus.AWAITING,
	SellRequestStatus.ADDED_BY_ADMIN,
	SellRequestStatus.FINISHED,
	SellRequestStatus.ADDED_WITH_VACATION,
];
