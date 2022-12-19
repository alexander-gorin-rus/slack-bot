export interface KafkaEmployeeVacationCreated {
	employeeId: string;
	employeeSlackId: string;
	createdBySlackId: string;
	createdById: string;
	approverList: KafkaApprover[];
	approverFinal: KafkaApprover;
	vacationId: string;
	createdAt: Date;
	from: Date;
	to: Date;
}

export interface KafkaApprover {
	employeeId: string;
	employeeSlackId: string;
	isApproved: IsApproved;
	answeredAt: Date | null;
}

export interface KafkaEmployeeApproveData {
	сreatedBy: string;
	сreatedBySlackId: string;
	approverList: KafkaApprover[];
	approverFinal: KafkaApprover;
	vacationId: string;
}

export interface KafkaEmployeeRejectVacationData {
	vacationId: string;
	createdBy: string;
	createdBySlackId: string;
	cancelledBy: string;
	cancelledBySlackId: string;
	cancelledAt: Date;
}

export type IsApproved = 'approved' | 'rejected' | 'notAnswered';

export interface KafkaDaysChangeData {
	employeeId: string;
	employeeSlackId: string;
	daysSummary: number;
	daysChange: number;
	typeOfInitiator: string;
	initiatorEventId: string;
	createdAt: Date;
}

export interface KafkaEmployeeDayoffData {
	employeeId: string;
	employeeSlackId: string;
	createdBy: string;
	createdBySlackId: string;
	dayOffId: string;
	createdAt: Date;
	from: Date;
	to: Date;
	hasToReturnWorkHours: boolean;
	approverList: KafkaApprover[];
	approverFinal: KafkaApprover;
}

export interface KafkaEmployeeDayoffApprovedData {
	dayOffId: string;
	createdBy: string;
	createdBySlackId: string;
	approverList: KafkaApprover[];
	approverFinal: KafkaApprover;
}

export interface KafkaEmployeeDayoffCancelData {
	dayOffId: string;
	employeeChangeId: string;
	employeeChangeSlackId: string;
	cancelledAt: Date;
}
