import { Controller, Get } from '@nestjs/common';
import { VacationRequestService } from '../database/service/vacation-request.service';
import { KafkaService } from './kafka.service';
import { DayoffRequestService } from '../database/service/dayoff-request.service';
import { VacationRequest } from '../database/entity/vacation-request.entity';
import { DayoffRequest } from '../database/entity/dayoff-request.entity';
import { VacationRequestStatus } from '../database/util/vacation-request-status.enum';
import { DayoffRequestStatus } from '../database/util/dayoff-request-status.enum';
import { TOPICS_LIST } from '../configs/topics';
import {
	getKafkaEmployeeDayoffCreateOrFinishData,
	getKafkaEmployeeVacationCreateOrFinalData,
} from './utils/tranformers';
import { logger } from '../_services/logger';

@Controller('/kafka')
export class KafkaController {
	constructor(
		private readonly kafkaService: KafkaService,
		private readonly vacationService: VacationRequestService,
		private readonly dayoffService: DayoffRequestService
	) {}

	async getVacations(): Promise<VacationRequest[]> {
		const result = await this.vacationService.find({
			where: { status: VacationRequestStatus.FINISHED },
			relations: ['employee', 'employee.head', 'confirms', 'confirms.manager'],
		});

		return result;
	}

	async getDayoffs(): Promise<DayoffRequest[]> {
		const result = await this.dayoffService.find({
			where: { status: DayoffRequestStatus.FINISHED },
			relations: ['employee', 'employee.head', 'confirms', 'confirms.manager'],
		});

		return result;
	}

	async sendArrayOfObjectsToKafka(topic: string, data: Array<any>) {
		logger.info(`Start migrate data to ${topic}`);
		await Promise.all(
			data.map(async (item, index) => {
				const tranformer =
					topic === TOPICS_LIST.EMPLOYEE_VACATION_FINISH
						? getKafkaEmployeeVacationCreateOrFinalData
						: getKafkaEmployeeDayoffCreateOrFinishData;
				logger.info(
					`Send message with id ${item.id} to topic: ${topic} | Object ${index + 1}/${data.length}`
				);
				await this.kafkaService.sendMessage(topic, tranformer(item, item.employee));
			})
		);
		logger.info(`End migrate data to ${topic}`);
	}

	@Get('/migrateData/vacations')
	async migrateFinishedVacations() {
		const vacations = await this.getVacations();
		logger.info(`Vacations to migrate: ${vacations.length}`);
		await this.sendArrayOfObjectsToKafka(TOPICS_LIST.EMPLOYEE_VACATION_FINISH, vacations);
	}

	@Get('/migrateData/dayoffs')
	async migrateFinishedDayoffs() {
		const dayoffs = await this.getDayoffs();
		logger.info(`Dayoffs to migrate: ${dayoffs.length}`);
		await this.sendArrayOfObjectsToKafka(TOPICS_LIST.EMPLOYEE_DAYOFF_FINISH, dayoffs);
	}
}
