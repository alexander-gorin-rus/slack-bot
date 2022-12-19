import {
	KafkaEmployeeVacationCreated,
	KafkaApprover,
	KafkaEmployeeApproveData,
	KafkaEmployeeRejectVacationData,
	IsApproved,
	KafkaDaysChangeData,
	KafkaEmployeeDayoffData,
	KafkaEmployeeDayoffApprovedData,
	KafkaEmployeeDayoffCancelData,
} from '../interfaces/producers-data.interface';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { VacationRequestConfirmStatus } from '../../database/util/vacation-request-confirm-status.enum';
import { VacationRequestConfirm } from '../../database/entity/vacation-request-confirm.entity';
import { DayoffRequest } from '../../database/entity/dayoff-request.entity';
import { DayoffRequestConfirm } from '../../database/entity/dayoff-request-confirm.entity';
import { VacationDayChange } from '../../database/entity/vacation-day-change.entity';
import { APPROVED_STATUSES } from '../constants/constants';
import { VacationRequestStatus } from '../../database/util/vacation-request-status.enum';
import { Employee } from '../../database/entity/employee.entity';

export function getFinalAprove(data: VacationRequest | DayoffRequest): KafkaApprover {
	const head = data.employee.head;
	const result: KafkaApprover = {
		employeeSlackId: head.slackId,
		employeeId: head?.globalId,
		isApproved: APPROVED_STATUSES.NOT_ANSWERED,
		answeredAt: null,
	};
	if (data.status === VacationRequestStatus.APPROVED_HEAD) {
		(result.isApproved = APPROVED_STATUSES.APPROVED), (result.answeredAt = new Date());
	}

	if (data.status === VacationRequestStatus.REJECTED_HEAD) {
		(result.isApproved = APPROVED_STATUSES.REJECTED), (result.answeredAt = new Date());
	}

	return result;
}

export function getKafkaEmployeeVacationCreateOrFinalData(
	data: VacationRequest,
	createdBy: Employee
): KafkaEmployeeVacationCreated {
	const result: KafkaEmployeeVacationCreated = {
		employeeId: data.employee.globalId,
		employeeSlackId: data.employee.slackId,
		createdById: createdBy.globalId,
		createdBySlackId: createdBy.slackId,
		approverList: getKafkaApproverList(data.confirms),
		approverFinal: getFinalAprove(data),
		...getKafkaVacation(data),
	};

	return result;
}

export function getKafkaEmployeeVacationApproveData(
	data: VacationRequest
): KafkaEmployeeApproveData {
	const result: KafkaEmployeeApproveData = {
		сreatedBy: data.employee.globalId,
		сreatedBySlackId: data.employee.slackId,
		approverList: getKafkaApproverList(data.confirms),
		approverFinal: getFinalAprove(data),
		vacationId: data.globalId,
	};

	return result;
}

export function getKafkaEmployeeRejectVacationData(
	data: VacationRequest,
	rejectedBy: Employee
): KafkaEmployeeRejectVacationData {
	return {
		vacationId: data.globalId,
		createdBy: data.employee.globalId,
		createdBySlackId: data.employee.slackId,
		cancelledBy: rejectedBy.globalId,
		cancelledBySlackId: rejectedBy.slackId,
		cancelledAt: new Date(),
	};
}

function getKafkaVacation(data: VacationRequest) {
	return {
		vacationId: data.globalId,
		createdAt: data.createdAt,
		from: new Date(data.from),
		to: new Date(data.to),
	};
}

function getKafkaApproverList(
	data: VacationRequestConfirm[] | DayoffRequestConfirm[]
): KafkaApprover[] {
	if (data && data.length) {
		return data.map((confirm) => {
			return getKafkaApprover(confirm);
		});
	}
	return null;
}

export function isApproved(data: VacationRequestConfirm | DayoffRequestConfirm): IsApproved {
	if (
		data.status === VacationRequestConfirmStatus.APPROVED ||
		data.status === VacationRequestConfirmStatus.AUTO_APPROVE
	)
		return APPROVED_STATUSES.APPROVED;
	if (data.status === VacationRequestConfirmStatus.REJECTED) return APPROVED_STATUSES.REJECTED;
	else return APPROVED_STATUSES.NOT_ANSWERED;
}

function getAnsweredAt(data: VacationRequestConfirm | DayoffRequestConfirm): Date | null {
	let approvedAt;
	if (data.status === VacationRequestConfirmStatus.WAIT) approvedAt = null;
	else if (
		data.status === VacationRequestConfirmStatus.APPROVED ||
		data.status === VacationRequestConfirmStatus.AUTO_APPROVE
	) {
		approvedAt = new Date();
	} else approvedAt = null;

	return approvedAt;
}

function getKafkaApprover(data: VacationRequestConfirm | DayoffRequestConfirm): KafkaApprover {
	return {
		employeeId: data?.manager.globalId,
		employeeSlackId: data?.manager.slackId,
		isApproved: isApproved(data),
		answeredAt: getAnsweredAt(data),
	};
}

export function getKafkaDaysChangeData(data: VacationDayChange): KafkaDaysChangeData {
	const daysSummary = Math.round(data.employee.days) + Math.round(data.days);
	return {
		employeeId: data.employee.globalId,
		employeeSlackId: data.employee.slackId,
		daysSummary: daysSummary,
		daysChange: Math.round(data.days),
		typeOfInitiator: data.typeOfInitiator,
		initiatorEventId: data.globalId,
		createdAt: data.createdAt,
	};
}

export function getKafkaEmployeeDayoffCreateOrFinishData(
	data: DayoffRequest,
	createdBy: Employee
): KafkaEmployeeDayoffData {
	return {
		employeeId: data.employee.globalId,
		employeeSlackId: data.employee.slackId,
		createdBy: createdBy.globalId,
		createdBySlackId: createdBy.slackId,
		dayOffId: data.globalId,
		createdAt: data.createdAt,
		from: new Date(data.from),
		to: new Date(data.to),
		hasToReturnWorkHours: data.workingOff,
		approverList: getKafkaApproverList(data.confirms),
		approverFinal: getFinalAprove(data),
	};
}

export function getKafkaEmployeeDayoffApprovedData(
	data: DayoffRequest,
	createdBy: Employee
): KafkaEmployeeDayoffApprovedData {
	return {
		dayOffId: data.globalId,
		createdBy: createdBy.globalId,
		createdBySlackId: createdBy.slackId,
		approverList: getKafkaApproverList(data.confirms),
		approverFinal: getFinalAprove(data),
	};
}

export function getKafkaEmployeeDayoffCancelData(
	data: DayoffRequest,
	cancelledBy: Employee
): KafkaEmployeeDayoffCancelData {
	return {
		employeeChangeId: cancelledBy.globalId,
		employeeChangeSlackId: cancelledBy.slackId,
		dayOffId: data.globalId,
		cancelledAt: new Date(),
	};
}
