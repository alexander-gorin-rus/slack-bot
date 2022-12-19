/* eslint-disable  @typescript-eslint/no-explicit-any */
import { ContextViewsInterface } from '../context/context-view.interface';

export const mock = (): {
	views: ContextViewsInterface;
	openParam: any;
	publishParam: any;
	pushParam: any;
	updateParam: any;
	ack: (arg: any) => Promise<void>;
	ackParam: any;
} => {
	const openParam = {};
	const publishParam = {};
	const pushParam = {};
	const updateParam = {};
	const ackParam = {};
	const views = {
		open: (...args) => Object.assign(openParam, args[0]),
		publish: (...args) => Object.assign(publishParam, args[0]),
		push: (...args) => Object.assign(pushParam, args[0]),
		update: (...args) => Object.assign(updateParam, args[0]),
	};
	const ack = (...args) => Object.assign(ackParam, args[0]);
	return {
		views,
		openParam,
		publishParam,
		pushParam,
		updateParam,
		ack,
		ackParam,
	};
};
