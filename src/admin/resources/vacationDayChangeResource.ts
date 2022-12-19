import AdminJS, { ResourceOptions } from 'adminjs';
import { AdminValidator } from '../admin.validator';
import { VacationDayChange } from '../../database/entity/vacation-day-change.entity';
import { KafkaService } from '../../kafka/kafka.service';
import { ActionResponse } from 'adminjs';
import { TOPICS_LIST } from '../../configs/topics';
import { getKafkaDaysChangeData } from '../../kafka/utils/tranformers';
import { VacationDaysChangeTypeOfInitiatorEnum } from '../../database/util/vacation-day-change-type-of-initiatior.enum';

const initVacationDayChangeResource = (kafkaService: KafkaService): ResourceOptions => {
	return {
		parent: {
			name: 'Отпуска/Отгулы',
		},
		actions: {
			edit: { isAccessible: false },
			delete: { isAccessible: false },
			bulkDelete: { isAccessible: false },
			new: {
				// eslint-disable-next-line require-await
				before: async (request) => {
					if (request.method === 'post') {
						const requiredFields = [
							AdminValidator.requiredField('employeeId'),
							AdminValidator.checkVacationDaysChange('days'),
							AdminValidator.requiredField('reason'),
						];
						AdminValidator.invoker(request, requiredFields);
					}
					return request;
				},
				after: async (response: ActionResponse) => {
					const change = await VacationDayChange.getRepository().findOne({
						where: { id: response.record.params.id },
						relations: ['employee'],
					});
					change.typeOfInitiator = VacationDaysChangeTypeOfInitiatorEnum.VACDAYS_CHANGE_MANUAL;
					change.createdAt = new Date();
					kafkaService.sendMessage(TOPICS_LIST.DAYS_CHANGE, getKafkaDaysChangeData(change));
					return response;
				},
			},
		},
		sort: {
			direction: 'desc',
			sortBy: 'id',
		},
		filterProperties: ['id', 'employeeId', 'reason', 'createdAt'],
		properties: {
			id: {
				position: 1,
			},
			employeeId: {
				position: 2,
				isRequired: true,
			},
			days: {
				position: 3,
				isRequired: true,
			},
			reason: {
				position: 4,
				isRequired: true,
			},
			createdAt: {
				position: 5,
				components: {
					filter: AdminJS.bundle('../components/custom-date-time-filter.tsx'),
				},
			},
			calculatedMonth: {
				isVisible: {
					show: false,
					edit: false,
				},
			},
			globalId: {
				isVisible: false,
			},
			typeOfInitiator: {
				isVisible: false,
			},
		},
	};
};

export const VacationDayChangeResource = (kafkaService: KafkaService) => ({
	resource: VacationDayChange,
	options: initVacationDayChangeResource(kafkaService),
});
