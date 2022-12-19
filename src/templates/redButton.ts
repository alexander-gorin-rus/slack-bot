import { ActionsBlock } from '@slack/bolt';
import { buttonBlock } from './button';

export const redButton = (text: string, action_id: string, value?: string): ActionsBlock => {
	return {
		type: 'actions',
		elements: [buttonBlock(text, action_id, value, 'danger')],
	};
};
