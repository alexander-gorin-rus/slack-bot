import { Controller } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VacationDayChangeService } from '../../database/service/vacation-day-change.service';
import { EmployeeService } from '../../database/service/employee.service';
import { VacationDayChange } from '../../database/entity/vacation-day-change.entity';
import { messageFormat } from '../../utils';
import { format } from '../../lib/functions';
import { Employee } from '../../database/entity/employee.entity';
import { SentryOverwatch } from '../../main/sentry.overwatch';
import { KafkaService } from '../../kafka/kafka.service';
import { TOPICS_LIST } from '../../configs/topics';
import { getKafkaDaysChangeData } from '../../kafka/utils/tranformers';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../../database/util/vacation-day-change-type-of-initiatior.enum';
import { CalendarService } from '../../calendar/calendar.service';
import { SoloProprietorStatus } from '../../database/util/employee-solo-proprietor-status.enum';

@Controller('calculation')
export class CalculationController {
	constructor(
		private vacationDayChangeService: VacationDayChangeService,
		private employeeService: EmployeeService,
		private readonly kafkaService: KafkaService,
		private calendar: CalendarService
	) {}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	@SentryOverwatch({ module: 'vacation', job: 'calculate' })
	async calculate() {
		const employees = await this.employeeService.getManyWithoutCalculatedVacationDays();
		employees.forEach(async (employee) => {
			if (employee.SPStatus === SoloProprietorStatus.SOLO_PROPRIETOR || employee.hasNoVacataionDays)
				return;
			const change = await this.createVacationDayChange(employee);
			await this.sendKafkaMessage(change);
		});
	}

	async createVacationDayChange(employee: Employee) {
		const today = this.calendar.today();
		const change = new VacationDayChange();
		change.employee = employee;
		change.days = employee.vacationDaysPerMonth;
		change.reason = messageFormat(
			'Автоматически начислено за {today, date, ::MMMM} {today, date, ::yyy} года',
			{ today }
		);
		change.calculatedMonth = format(today, 'MM.yyyy'); // 10.2022
		change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_INCREASE_MONTHLY;
		await this.vacationDayChangeService.save(change);

		return change;
	}

	async sendKafkaMessage(change: VacationDayChange) {
		await this.kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));
	}
}
