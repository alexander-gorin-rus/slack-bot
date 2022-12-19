import { Body, Controller, Get, Post } from '@nestjs/common';
import {
	APPROVED_ALL_PMS_OR_HEAD_ONLY,
	DayoffRequestService,
} from '../database/service/dayoff-request.service';
import { HelperService } from '../main/helper.service';
import {
	DayoffRequestStatus,
	DayoffRequestStatusTranslation,
} from '../database/util/dayoff-request-status.enum';
import { PlannedDayoffsService } from './planned-dayoffs/planned-dayoff.service';
import { KafkaService } from '../kafka/kafka.service';
import { TOPICS_LIST } from '../configs/topics';
import {
	getKafkaDaysChangeData,
	getKafkaEmployeeDayoffCancelData,
} from '../kafka/utils/tranformers';
import { Employee } from '../database/entity/employee.entity';
import { VacationDayChange } from '../database/entity/vacation-day-change.entity';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../database/util/vacation-day-change-type-of-initiatior.enum';
import { VacationDayChangeService } from '../database/service/vacation-day-change.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

@Controller('/dayoff')
export class DayoffController {
	constructor(
		private dayoffRequestService: DayoffRequestService,
		private plannedDayOffService: PlannedDayoffsService,
		private helper: HelperService,
		private readonly kafkaService: KafkaService,
		private vacationDayChangeService: VacationDayChangeService,
		private emailtTemplatesService: EmailTemplatesService
	) {}

	@Get('/export')
	async export() {
		const records = await this.dayoffRequestService.export();
		return {
			records: records.map((rec) => ({
				...rec,
				status: DayoffRequestStatusTranslation.find((e) => e.value === rec.status)?.label,
			})),
		};
	}

	@Post('/rejectDayoffRequest')
	async updateDayoffRequest(@Body() body: any) {
		const request = await this.dayoffRequestService.getById(body.id, [
			'employee',
			'employee.head',
			'confirms',
			'confirms.manager',
		]);
		const isApprovedAllPMsOrHeadOnly = APPROVED_ALL_PMS_OR_HEAD_ONLY.includes(request.status);
		request.status = DayoffRequestStatus.CANCELLED_BY_ADMIN;

		const unit = this.helper.wordForm(request.days, ['день', 'дня', 'дней']);
		const date = this.helper.convertDate(request.from);

		const change = new VacationDayChange();
		change.employee = request.employee;
		change.days = request.days;
		change.reason = `Отклонен отгул с ${date} на ${request.days} ${unit}`;
		change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION_CANCEL;
		change.globalId = request.globalId;
		change.createdAt = new Date();
		this.vacationDayChangeService.save(change);

		request.cancelReason = body.cancelReason;
		await this.dayoffRequestService.save(request);

		const secondEmailList = [request.employee.email];

		request.confirms.forEach((confirm) => {
			if (confirm.manager) secondEmailList.push(confirm.manager.email);
		});

		if (request.employee.head) {
			secondEmailList.push(request.employee.head.email);
		}

		// send slack notification
		const slackIdsToNotify = await this.helper.getPMandLPRNotificationSlackIds(
			request,
			isApprovedAllPMsOrHeadOnly
		);
		await this.plannedDayOffService.postManagerMessage(request, slackIdsToNotify, request.employee);

		await this.emailtTemplatesService.sendEmailDayfoffCancelForFinDep([], request);
		await this.emailtTemplatesService.sendEmailDayfoffCancelForEmployeeFromAdmin(
			secondEmailList,
			request
		);

		this.kafkaService.sendMessage(
			TOPICS_LIST.EMPLOYEE_DAYOFF_CANCEL,
			getKafkaEmployeeDayoffCancelData(request, {
				globalId: 'admin',
				slackId: 'admin',
			} as Employee)
		);

		this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));

		return request;
	}
}
