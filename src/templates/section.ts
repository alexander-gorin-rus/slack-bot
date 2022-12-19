import { SectionBlock } from '@slack/types';
import { plainText } from './plainText';

export const section = (text: string): SectionBlock => {
	return {
		type: 'section',
		text: plainText(text),
	};
};
