import MessageFormat from '@messageformat/core';

export const messageFormat = (msg: string, data: any) => {
	const mf = new MessageFormat('ru');

	return mf.compile(msg)(data);
};
