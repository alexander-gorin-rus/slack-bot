export const VACATION_STATUS_PREFIX = 'В отпуске';
export const DAYOFF_STATUS_PREFIX = 'В отгуле';

// https://api.slack.com/docs/presence-and-status#user-presence-and-status__custom-status__reading-statuses
export const STATUS_NO_EXPIRATION = 0;

export interface ProfileUpdate {
	slackId: string;
	text: string;
	emoji: string;
	expiration: number;
}
