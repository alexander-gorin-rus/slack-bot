import { InputBlock, Option } from '@slack/types';
import { SoloProprietorStatus } from '../database/util/employee-solo-proprietor-status.enum';
import { plainText } from './plainText';

export const checkboxes = (
	options: string[],
	label: string,
	//blockId: string,
	actionId: string,
	isSP?: SoloProprietorStatus
): InputBlock => {
	const checkboxOptions: Option[] = options.map((item) => {
		return {
			text: plainText(item),
			value: item,
		};
	});
	return {
		type: 'input',
		optional: true,
		label: plainText('Планируется отрабатывать?'),
		element: {
			type: 'checkboxes',
			options: checkboxOptions,
			initial_options: isSP ? undefined : checkboxOptions,
			action_id: actionId,
		},
	};
};
