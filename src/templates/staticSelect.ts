import { InputBlock, PlainTextOption } from '@slack/types';

export const staticSelect = (
	options: Record<string, string>,
	blockId: string,
	actionId: string,
	placeholder: string,
	labelPlaceholder: string
): InputBlock => {
	const slackOptions: PlainTextOption[] = Object.getOwnPropertyNames(options).map((key) => {
		return {
			text: {
				type: 'plain_text',
				text: options[key],
				emoji: true,
			},
			value: key,
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
			options: slackOptions,
			action_id: actionId,
		},
	};
};

export const staticSelectCustom = (
	options: PlainTextOption[],
	blockId: string,
	actionId: string,
	placeholder: string,
	labelPlaceholder: string
): InputBlock => {
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
