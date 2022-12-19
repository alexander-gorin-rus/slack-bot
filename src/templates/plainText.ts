import { PlainTextElement } from '@slack/web-api';

export const plainText = (text: string): PlainTextElement => ({
	type: 'plain_text',
	text: text,
	emoji: true,
});
