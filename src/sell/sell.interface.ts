import { ContextFormData } from '../slack-bot/context/context-form-data';

export interface SellInterface extends ContextFormData {
	date: Date;
	days: string;
}
