import { InputBlock } from '@slack/web-api';
import { plainText } from './plainText';

export const datePicker = (
	placeholder: string,
	label: string,
	actionId?: string,
	blockId = 'datepicker'
): InputBlock => {
	return {
		type: 'input',
		block_id: blockId,
		element: {
			type: 'datepicker',
			placeholder: plainText(placeholder),
			action_id: actionId ?? 'noop',
		},
		label: plainText(label),
	};
};
