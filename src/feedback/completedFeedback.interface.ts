import { ContextFormData } from '../slack-bot/context/context-form-data';

export interface CompletedFeedbackInterface extends ContextFormData {
	respondentId: number;
}
