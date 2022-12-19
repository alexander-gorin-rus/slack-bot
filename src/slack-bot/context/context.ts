import { AckFn, DialogValidation, SayArguments, SayFn } from '@slack/bolt';
import { Employee } from '../../database/entity/employee.entity';
import { ContextViewsInterface } from './context-view.interface';

export class Context<TFormData = any> {
	constructor(
		public user?: Employee,
		public views?: ContextViewsInterface,
		public ack?: AckFn<void> | AckFn<string | SayArguments> | AckFn<DialogValidation> | AckFn<any>,
		public say?: SayFn,
		public triggerId?: string,
		public viewId?: string,
		public formData?: TFormData,
		public actionData?: string,
		public messageId?: string,
		public channelId?: string,
		public userId?: string
	) {}
}
