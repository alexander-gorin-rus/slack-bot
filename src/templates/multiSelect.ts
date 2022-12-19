import { InputBlock, MultiStaticSelect, PlainTextOption } from '@slack/types';
import { plainText } from './plainText';

export const multiSelect = (
	options: Record<string, string>,
	blockId: string,
	actionId: string,
	placeholder: string,
	labelPlaceholder: string
): InputBlock => {
	const slackOptions: PlainTextOption[] = Object.getOwnPropertyNames(options).map((key) => {
		return {
			text: plainText(options[key]),
			value: key,
		};
	});

	return {
		type: 'input',
		block_id: blockId,
		label: plainText(labelPlaceholder),
		element: {
			type: 'multi_static_select',
			placeholder: plainText(placeholder),
			options: slackOptions,
			action_id: actionId,
		} as MultiStaticSelect,
	};
};

export const multiSelectCustom = (
	options: PlainTextOption[],
	blockId: string,
	actionId: string,
	placeholder: string,
	labelPlaceholder: string,
	initialOptions?: PlainTextOption[]
): InputBlock => {
	return {
		type: 'input',
		block_id: blockId,
		label: plainText(labelPlaceholder),
		element: {
			type: 'multi_static_select',
			placeholder: plainText(placeholder),
			options: options,
			action_id: actionId,
			initial_options: initialOptions,
		},
	};
};
