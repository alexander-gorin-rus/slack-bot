import { ResourceOptions } from 'adminjs';
import { FeedbackQuestion } from '../../database/entity/feedback-question.entity';
import { AdminValidator } from '../admin.validator';

const initQuestionListResource = (): ResourceOptions => {
	return {
		parent: {
			name: 'Отзывы о работе',
			icon: 'List',
		},
		filterProperties: ['order', 'text'],
		properties: {
			id: {
				isVisible: false,
			},
			order: {
				position: 2,
				isRequired: true,
			},
			text: {
				position: 3,
				isRequired: true,
			},
			placeholder: {
				position: 4,
				isRequired: true,
			},
		},
		actions: {
			edit: {
				actionType: 'record',
				// eslint-disable-next-line require-await
				before: async (request) => {
					const validators = [
						AdminValidator.maxLength(
							'placeholder',
							150,
							'Поле "Пример" не может содержать больше 150 символов'
						),
						AdminValidator.isPositive('order'),
					];
					AdminValidator.invoker(request, validators);

					return request;
				},
			},
		},
	};
};

export const FeedbackQuestionResource = {
	resource: FeedbackQuestion,
	options: initQuestionListResource(),
};
