import { PlainTextElement, InputBlock } from '@slack/types';

export const textInput = (
	label: string,
	actionId: string,
	text: string,
	optional?: boolean
): InputBlock => {
	return {
		type: 'input',
		block_id: actionId,
		optional,
		element: {
			type: 'plain_text_input',
			action_id: actionId,
			placeholder: {
				type: 'plain_text',
				text: text,
			},
		},
		label: {
			type: 'plain_text',
			text: label,
			emoji: true,
		},
	};
};

function placeholder(text?: string): { placeholder: PlainTextElement } | Record<string, never> {
	if (!text) return {};
	return {
		placeholder: {
			type: 'plain_text',
			text,
		},
	};
}

export const textArea = (
	label: string,
	actionId: string,
	text?: string,
	value?: string,
	optional?: boolean
): InputBlock => {
	return {
		type: 'input',
		block_id: actionId,
		optional,
		element: {
			type: 'plain_text_input',
			multiline: true,
			action_id: actionId,
			...placeholder(text),
			initial_value: value,
		},
		label: {
			type: 'plain_text',
			text: label,
			emoji: true,
		},
	};
};
