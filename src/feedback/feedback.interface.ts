import { ContextFormData } from '../slack-bot/context/context-form-data';

export interface FeedbackEditInterface {
	respondentId: number;
}

export interface AnswerItemInterface {
	questionId: number;
	answerId: number;
}

export interface CompletedFeedbackInterface extends ContextFormData {
	respondentId: number;
}

export interface CreateFeedbackInterface extends ContextFormData {
	employeeTo: string;
	employeeIds: string[];
	date: Date;
}

export interface EvolutionEnmployeeWorkInterface {
	feedbackId: number;
	isModal?: boolean;
}

export interface ResubmitSurveyInterface {
	respondentId: number;
}

export interface ResubmitSurveyDoneInterface extends ContextFormData {
	respondentId: number;
}

export interface ViewFeedbacksInterface extends ContextFormData {
	askDirectHead?: {
		text: {
			type: string;
			text: string;
			emoji: boolean;
		};
		value: 'ok';
	};
	feedbackId: number;
	typeMessage: string;
	messageTsHR?: string;
}

export interface SendFeedbackSuccessInterface extends ContextFormData {
	description: string;
	emails: string[];
	feedbackId: number;
	typeMessage: string;
	isModal?: boolean;
}
