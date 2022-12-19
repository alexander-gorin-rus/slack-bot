import { ActionsBlock, Button } from '@slack/bolt';
import { plainText } from './plainText';

type ButtonStyle = Button['style'];

export const buttonBlock = (
	text: string,
	action_id: string,
	value?: string,
	style?: ButtonStyle
): Button => ({
	type: 'button',
	style: style,
	text: plainText(text),
	value: value,
	action_id,
});

export const button = (
	text: string,
	action_id: string,
	value?: string,
	style?: ButtonStyle | 'default'
): ActionsBlock => {
	let styles: ButtonStyle;

	switch (style) {
		case 'danger':
			styles = 'danger';
			break;
		case 'default':
			styles = undefined;
			break;
		default:
			styles = 'primary';
	}

	return {
		type: 'actions',
		elements: [buttonBlock(text, action_id, value, styles)],
	};
};
