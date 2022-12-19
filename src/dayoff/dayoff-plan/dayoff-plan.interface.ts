import { ContextFormData } from '../../slack-bot/context/context-form-data';

export interface DayoffPlanInterface extends ContextFormData {
	date: Date;
	days: string;
	reason: string;
	workingOff: string;
	pmSlackIds: string[];
	addDays?: number;
}
