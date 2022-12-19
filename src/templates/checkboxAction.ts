import { ActionsBlock } from '@slack/types';

export const checkboxesAction = (text: string): ActionsBlock => {
	return {
		type: 'actions',
		block_id: 'check',
		elements: [
			{
				type: 'checkboxes',
				options: [
					{
						text: {
							type: 'plain_text',
							text,
							emoji: true,
						},
						value: 'value-0',
					},
				],
				action_id: 'actionId-0',
			},
		],
	};
};
