export const NO_PM_SELECTED = 'nonPM';

/**
 * Returns `true`  if option "У меня нет ПМ-ов" selected
 */
export function isNoPMSelected(slackIds: string[]) {
	if (!slackIds) return false;
	return slackIds.some((slackId) => slackId === NO_PM_SELECTED);
}

/**
 * Returns `true` if some PM selected
 */
export function isSomePMSelected(slackIds: string[]) {
	return !isNoPMSelected(slackIds) && slackIds.length > 0;
}

/**
 * Checks validity of PM selection
 */
export function isPMSelectionValid(slackIds: string[]) {
	const isInvalid = isNoPMSelected(slackIds) && slackIds.length > 1;
	return !isInvalid;
}
