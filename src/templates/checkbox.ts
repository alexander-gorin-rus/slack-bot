import { InputBlock } from '@slack/web-api';
import { plainText } from './plainText';

export const checkbox = (label: string, header: string, actionId: string): InputBlock => {
	return {
		type: 'input',
		optional: true,
		element: {
			action_id: actionId,
			type: 'checkboxes',
			options: [
				{
					text: plainText(label),
					value: 'ok',
				},
			],
		},
		label: plainText(header),
	};
};
