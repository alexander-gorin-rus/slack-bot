import { ContextBlock } from '@slack/types';
import { imageBlock } from './image';
import { mkdownText } from './mkdown';

export const imageContext = (imageUrl: string, text: string): ContextBlock => {
	return {
		type: 'context',
		elements: [imageBlock(imageUrl), mkdownText(text)],
	};
};
