import { Controller } from '@nestjs/common';
import { ActionsEnum } from '../../configs/actions';
import { DayoffRequestConfirm } from '../../database/entity/dayoff-request-confirm.entity';
import { DayoffRequest } from '../../database/entity/dayoff-request.entity';
import { DayoffRequestService } from '../../database/service/dayoff-request.service';
import { EmployeeService } from '../../database/service/employee.service';
import { Context } from '../../slack-bot/context/context';
import { Action } from '../../slack-bot/decorator/action.decorator';
import { View } from '../../slack-bot/decorator/view.decorator';
import { HardValidatorService } from './hard-validator.service';
import { DayoffPlanInterface } from './dayoff-plan.interface';
import { ViewService } from './view.service';
import { ViewsOpenArguments, WebClient } from '@slack/web-api';
import { DayoffRequestStatus } from '../../database/util/dayoff-request-status.enum';
import { HelperService } from '../../main/helper.service';
import { ProdCalendarService } from '../../database/service/production-calendar.service';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import { getKafkaEmployeeDayoffCreateOrFinishData } from '../../kafka/utils/tranformers';
import { DayoffPlanService } from './dayfoff-plan.service';
import { isSomePMSelected } from '../../utils';
import { addDays } from '../../lib/functions';

@Controller('dayoff-plan')
export class DayoffPlanController {
	constructor(
		private hardValidator: HardValidatorService,
		private requestService: DayoffRequestService,
		private viewService: ViewService,
		private employeeService: EmployeeService,
		private helper: HelperService,
		private prodCalendar: ProdCalendarService,
		private readonly kafkaService: KafkaService,
		private dayoffPlanService: DayoffPlanService,
		private client: WebClient
	) {}

	@Action(ActionsEnum.WORKINGOFF)
	async noop({ ack }: Context<DayoffPlanInterface>): Promise<void> {
		await ack();
	}

	@Action(ActionsEnum.DAYOFF_PLAN)
	async modal({ ack, views, triggerId, user }: Context<DayoffPlanInterface>): Promise<void> {
		await ack();
		const pmList = await this.employeeService.getPmOptionList();
		const view = this.viewService.main(user, pmList);
		await views.open({ trigger_id: triggerId, view });
	}

	@View(ActionsEnum.DAYOFF_PLAN)
	async plan({ ack, formData, user }: Context<DayoffPlanInterface>): Promise<void> {
		const reqYear = String(formData.date.getFullYear());
		const allowYear = await this.prodCalendar.findOne({
			year: reqYear,
			active: true,
		});
		if (!allowYear) {
			await ack({
				response_action: 'errors',
				errors: {
					date: `К сожалению, планирование отгула на ${reqYear} год невозможно, поскольку не настроен производственный календарь. Свяжись с любым из hr-ов за помощью.`,
				},
			});
			return;
		}
		const prodCalendar = await this.helper.prodCalendarCalculator(
			formData.date,
			Number(formData.days),
			'dayoff'
		);
		if (prodCalendar.decision === false) {
			await ack({
				response_action: 'errors',
				errors: { date: prodCalendar.reason },
			});
			return;
		}
		const errors = await this.hardValidator.validate(formData, user, prodCalendar.to);
		if (errors) {
			await ack({ response_action: 'errors', errors });
			return;
		}
		const view = (await this.viewService.confirm(
			user,
			formData,
			prodCalendar.to
		)) as ViewsOpenArguments;
		// Сохранение формы
		formData.addDays = prodCalendar.to;
		view.private_metadata = formData.getPrivateMetadata();
		await ack({ response_action: 'push', view });
	}

	@View(ActionsEnum.DAYOFF_SEND)
	async send({ ack, user, formData }: Context<DayoffPlanInterface>): Promise<void> {
		const request = new DayoffRequest();
		request.from = formData.date;
		request.days = Number(formData.days);
		request.employee = user;
		request.workingOff = Boolean(formData.workingOff);
		request.to = addDays(formData.date, Number(formData.days) + formData.addDays - 1);
		request.reason = formData.reason;
		if (isSomePMSelected(formData.pmSlackIds)) {
			const PMList = (
				await Promise.all(
					formData.pmSlackIds.map((slackId) => this.employeeService.getBySlackId(slackId))
				)
			).filter((i) => i);
			request.confirms = PMList.map((employee) => {
				const confirm = new DayoffRequestConfirm();
				confirm.dayoffRequest = request;
				confirm.manager = employee;
				return confirm;
			});
		} else {
			request.confirms = [];
			request.status = DayoffRequestStatus.HEAD_ONLY_REQUEST;
		}
		await this.requestService.save(request);
		await this.kafkaService.sendMessage(
			TOPICS_LIST.EMPLOYEE_DAYOFF_CREATED,
			getKafkaEmployeeDayoffCreateOrFinishData(request, request.employee)
		);
		const msg = this.dayoffPlanService.plannedDayoffMessage(user.slackId, request);
		await this.client.chat.postMessage(msg);
		const view = this.viewService.done(user, request);
		await ack({ response_action: 'push', view });
	}
}
