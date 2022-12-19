import { ResourceOptions } from 'adminjs';
import { Position } from '../../database/entity/positions.entity';

const initPositionResource = (): ResourceOptions => {
	return {
		parent: {
			name: 'Настройки панели',
			icon: 'Gear',
		},
		filterProperties: ['name', 'globalId'],
		properties: {
			id: {
				position: 1,
			},
			name: {
				position: 2,
			},
			globalId: {
				position: 3,
			},
		},
		actions: {
			new: { isAccessible: false },
			delete: { isAccessible: false },
			edit: { isAccessible: false },
		},
	};
};

export const PositionResource = {
	resource: Position,
	options: initPositionResource(),
};
