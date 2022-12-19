import { PlainTextOption, StaticSelect } from '@slack/types';
import { plainText } from './plainText';

export const modalSelect = (payload: string[], actionId: string): StaticSelect => {
	const options: PlainTextOption[] = payload.map((option) => {
		return {
			text: plainText(option),
			value: option,
		};
	});
	return {
		type: 'static_select',
		placeholder: plainText('Отпуска'),
		options: options,
		action_id: actionId,
	};
};
