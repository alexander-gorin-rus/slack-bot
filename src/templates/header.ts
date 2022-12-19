import { HeaderBlock } from '@slack/types';
import { plainText } from './plainText';

export const header = (text: string): HeaderBlock => {
	return {
		type: 'header',
		text: plainText(text),
	};
};
