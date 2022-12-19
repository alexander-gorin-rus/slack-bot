import { ContextFormData } from '../slack-bot/context/context-form-data';

export interface CreateFeedbackInterface extends ContextFormData {
	employeeTo: string;
	employeeIds: string[];
	date: Date;
}
