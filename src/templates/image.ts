import { ContextBlock, ImageBlock } from '@slack/web-api';

export const imageBlock = (url: string, altText = 'image'): ImageBlock => ({
	type: 'image',
	image_url: url,
	alt_text: altText,
});

export const image = (imageUrl: string): ContextBlock => {
	return {
		type: 'context',
		elements: [imageBlock(imageUrl)],
	};
};
