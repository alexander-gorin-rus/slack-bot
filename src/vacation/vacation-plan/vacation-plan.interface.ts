import { ContextFormData } from '../../slack-bot/context/context-form-data';

export interface VacationPlanInterface extends ContextFormData {
	date: string;
	days: string;
	pmSlackIds: string[];
	startDate: string;
	addAnotherDays: number;
	addDays?: number;
	sellDays?: number;
	sellHolidaysDays?: number;
	requestId?: number;
}
