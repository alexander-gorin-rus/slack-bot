import { Controller, Post, Body, Get } from '@nestjs/common';
import {
	APPROVED_ALL_PM_OR_HEAD_ONLY,
	VacationRequestService,
} from '../database/service/vacation-request.service';
import { PlannedVacationsService } from './planned-vacation/planned-vacations.service';
import { HelperService } from '../main/helper.service';
import { EmailTpl } from '../main/email-tpl.decorator';
import { EmailSender } from '../main/email-message-option.interface';
import { KafkaService } from '../kafka/kafka.service';
import { TOPICS_LIST } from '../configs/topics';
import {
	getKafkaDaysChangeData,
	getKafkaEmployeeRejectVacationData,
} from '../kafka/utils/tranformers';
import { Employee } from '../database/entity/employee.entity';
import { VacationDayChange } from '../database/entity/vacation-day-change.entity';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../database/util/vacation-day-change-type-of-initiatior.enum';
import { VacationDayChangeService } from '../database/service/vacation-day-change.service';
import { SellRequestService } from '../database/service/sell.service';
import { SellRequestStatus } from '../database/util/sell-request-status.enum';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import {
	VacationRequestStatus,
	VacationRequestStatusTranslation,
} from '../database/util/vacation-request-status.enum';

@Controller('/vacation')
export class VacationController {
	@EmailTpl('vacationCancelForFinDep') vacationCancelForFinDep: EmailSender;
	@EmailTpl('vacationCancelForEmployee') vacationCancelForEmployee: EmailSender;

	constructor(
		private readonly vacationService: VacationRequestService,
		private plannedVacations: PlannedVacationsService,
		private helper: HelperService,
		private readonly kafkaService: KafkaService,
		private vacationDayChangeService: VacationDayChangeService,
		private sellRequestService: SellRequestService,
		private emailTemplatesService: EmailTemplatesService
	) {}

	@Get('/export')
	async export() {
		const records = await this.vacationService.export();
		return {
			records: records.map((rec) => ({
				...rec,
				status: VacationRequestStatusTranslation.find((e) => e.value === rec.status)?.label,
			})),
		};
	}

	@Post('/rejectVacation')
	async rejectVacation(@Body() body: any) {
		const request = await this.vacationService.getById(body.id, [
			'employee',
			'employee.head',
			'confirms',
			'confirms.manager',
		]);
		const isApprovedAllPMsOrHeadOnly = APPROVED_ALL_PM_OR_HEAD_ONLY.includes(request.status);
		request.status = VacationRequestStatus.CANCELLED_BY_ADMIN;
		request.cancelReason = body.cancelReason;

		const unit = this.helper.wordForm(request.days, ['день', 'дня', 'дней']);
		const date = this.helper.convertDate(request.from);

		const change = new VacationDayChange();
		change.employee = request.employee;
		change.days = request.days;
		change.reason = `Отклонен отпуск с ${date} на ${request.days} ${unit} администратором`;
		change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_VACATION_CANCEL;
		change.globalId = request.globalId;
		change.createdAt = new Date();
		this.vacationDayChangeService.save(change);

		await this.vacationService.save(request);

		const sellRequest = await this.sellRequestService.findOne(
			{ vacationId: request.id },
			{ relations: ['employee'] }
		);
		if (sellRequest) {
			sellRequest.status = SellRequestStatus.REJECTED_EMPLOYEE;
			await this.sellRequestService.save(sellRequest);
		}
		const secondEmailList = [request.employee.email];

		request.confirms.forEach((confirm) => {
			if (confirm.manager) {
				secondEmailList.push(confirm.manager.email);
			}
		});

		if (request.employee.head) {
			secondEmailList.push(request.employee.head.email);
		}

		// send slack notification
		const slackIdsToNotify = await this.helper.getPMandLPRNotificationSlackIds(
			request,
			isApprovedAllPMsOrHeadOnly
		);

		await this.plannedVacations.postManagerMessage(request, slackIdsToNotify, request.employee);
		await this.emailTemplatesService.sendEmailVacationCancelForFinDep([], request);
		await this.emailTemplatesService.sendEmailVacationCancelForEmployee(secondEmailList, request);

		this.kafkaService.sendMessage(
			TOPICS_LIST.EMPLOYEE_VACATION_CANCEL,
			getKafkaEmployeeRejectVacationData(request, {
				globalId: 'admin',
				slackId: 'admin',
			} as Employee)
		);
		this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));

		return request;
	}
}
