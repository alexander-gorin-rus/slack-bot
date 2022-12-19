import { ResourceOptions } from 'adminjs';
import { EmailTemplate } from '../../database/entity/email-template.entity';
import { AdminValidator } from '../admin.validator';

const initEmailTemplateResource = (): ResourceOptions => {
	return {
		parent: {
			name: 'Настройки панели',
			icon: 'Gear',
		},
		filterProperties: ['name', 'subject', 'template', 'code'],
		properties: {
			id: {
				position: 1,
			},
			name: {
				position: 2,
			},
			subject: {
				position: 3,
			},
			template: {
				position: 4,
				type: 'textarea',
				props: {
					rows: 15,
				},
			},
			code: {
				isDisabled: true,
				isVisible: {
					show: false,
					edit: true,
				},
			},
			emails: {
				isVisible: {
					list: false,
					edit: true,
				},
			},
		},
		actions: {
			new: { isAccessible: false },
			delete: { isAccessible: false },
			edit: {
				// eslint-disable-next-line require-await
				before: async (request) => {
					if (request.method === 'post') {
						const requiredFields = [
							AdminValidator.requiredField('name'),
							AdminValidator.requiredField('subject'),
							AdminValidator.requiredField('template'),
						];
						AdminValidator.invoker(request, requiredFields);
					}
					return request;
				},
			},
		},
	};
};

export const EmailTemplateResource = {
	resource: EmailTemplate,
	options: initEmailTemplateResource(),
};
