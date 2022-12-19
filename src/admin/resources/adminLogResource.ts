import AdminJS, { ResourceOptions } from 'adminjs';
import { AdminLog } from '../../database/entity/admin-log.entity';

const initAdminLogResource = (): ResourceOptions => {
	return {
		parent: {
			name: 'Настройки панели',
			icon: 'Gear',
		},
		sort: {
			direction: 'desc',
			sortBy: 'id',
		},
		actions: {
			edit: { isAccessible: false },
			delete: { isAccessible: false },
			bulkDelete: { isAccessible: false },
			new: { isAccessible: false },
			show: {
				isAccessible: true,
			},
		},
		listProperties: ['id', 'createdAt', 'adminId'],
		filterProperties: ['id', 'createdAt', 'adminId', 'resource', 'record', 'action'],
		properties: {
			createdAt: {
				components: {
					filter: AdminJS.bundle('../components/custom-date-time-filter.tsx'),
				},
			},
		},
	};
};

export const AdminLogResource = {
	resource: AdminLog,
	options: initAdminLogResource(),
	sort: {
		direction: 'desc',
		sortBy: 'id',
	},
};
