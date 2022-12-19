import AdminJS, { ResourceOptions } from 'adminjs';
import { ProductionCalendar } from '../../database/entity/production-calendar.entity';

const initProductionCalendarResource = (): ResourceOptions => {
	return {
		parent: {
			name: 'Настройки панели',
		},
		actions: {
			edit: {
				isAccessible: false,
			},
			delete: { isAccessible: false },
			new: {
				isAccessible: true,
			},
			editCalendar: {
				isVisible: true,
				icon: 'Calendar',
				actionType: 'record',
				handler: async (request, response, context) => {
					if (request.method === 'post') {
						if (Object.prototype.hasOwnProperty.call(request.payload, 'active')) {
							await context.record.set('active', request.payload.active);
						}
						await context.record.set(
							'nonWorkingDays',
							JSON.stringify(request.payload.customWeekDays)
						);
						await context.record.save();
					}

					return {
						record: context.record.toJSON(context.currentAdmin),
					};
				},
				component: AdminJS.bundle('../components/production-calendar.tsx'),
			},
		},
		listProperties: ['year', 'active'],
		filterProperties: ['year', 'active'],
		showProperties: ['id', 'year', 'active'],
		sort: {
			direction: 'desc',
			sortBy: 'year',
		},
		properties: {
			year: {
				isVisible: {
					edit: true,
				},
			},
			nonWorkingDays: {
				isVisible: {
					edit: false,
				},
			},
			active: {
				components: {
					filter: AdminJS.bundle('../components/custom-select-filter.tsx'),
				},
			},
		},
	};
};

export const ProductionCalendarResource = {
	resource: ProductionCalendar,
	options: initProductionCalendarResource(),
};
