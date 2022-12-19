export interface EmailMessageOption {
	to: string | string[];
	subject: string;
	html: string;
	references?: string | string[];
}

export type EmailSender = (to: string | string[], data: any, options?: any) => void;
