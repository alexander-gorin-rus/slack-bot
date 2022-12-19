import { KnownBlock } from '@slack/web-api';

export const multiUsersSelect = (
	blockId: string,
	actionId: string,
	labelTitle: string
): KnownBlock => {
	return {
		type: 'input',
		block_id: blockId,
		element: {
			type: 'multi_users_select',
			placeholder: {
				type: 'plain_text',
				text: 'Укажи ПМ-ов',
				emoji: true,
			},
			action_id: actionId,
		},
		label: {
			type: 'plain_text',
			text: labelTitle,
			emoji: true,
		},
	};
};
