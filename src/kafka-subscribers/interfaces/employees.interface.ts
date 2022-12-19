export enum EmployeeStatuses {
	TRIAL_PERIOD = 2,
	EMPLOYEE = 3,
	DISMISSAL = 4,
}

export interface EmployeesNew {
	globalId: string;
	firstName: string;
	firstNameEn: string;
	lastName: string;
	lastNameEn: string;
	miggleName: string;
	miggleNameEn: string;
	email: string;
	supervisorId: string;
	positionId: string;
	statusId: EmployeeStatuses;
	isLpr: boolean;
	code1c: string;
	phone: string;
	gender: 'f' | 'm';
	employmentTypeId: number;
	grade: number;
	birthday: Date;
	cityId: number;
	workplaceId: number;
	officeId: number;
	firstDay: Date;
}

export type EmployeesUpdate = Omit<EmployeesNew, 'firstNameEn' | 'lastNameEn' | 'middleNameEn'>;
