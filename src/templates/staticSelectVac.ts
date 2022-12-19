import { KnownBlock, PlainTextOption } from '@slack/types';

export const staticSelectVac = (
	payload: string[],
	blockId: string,
	actionId: string,
	placeholder: string,
	labelPlaceholder: string
): KnownBlock => {
	const options: PlainTextOption[] = payload.map((option) => {
		return {
			text: {
				type: 'plain_text',
				text: option,
				emoji: true,
			},
			value: option,
		};
	});

	return {
		type: 'input',
		block_id: blockId,
		label: {
			type: 'plain_text',
			text: labelPlaceholder,
		},
		element: {
			type: 'static_select',
			placeholder: {
				type: 'plain_text',
				text: placeholder,
			},
			options: options,
			action_id: actionId,
		},
	};
};
