export type MessagesFn = (msg: string, data: Record<string, any>) => string;

export interface Messages extends MessagesFn {
	MessagesInjectToken: 'messages_inject_token';
}

export class Messages implements Messages {}
