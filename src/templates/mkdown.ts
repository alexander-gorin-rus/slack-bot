import { MrkdwnElement, SectionBlock } from '@slack/web-api';

export const mkdownText = (text: string): MrkdwnElement => ({
	type: 'mrkdwn',
	text: text,
});

export const mkdown = (text: string): SectionBlock => {
	return {
		type: 'section',
		text: mkdownText(text),
	};
};
