import { DividerBlock } from '@slack/web-api';

export const divider = (): DividerBlock => {
	return {
		type: 'divider',
	};
};
