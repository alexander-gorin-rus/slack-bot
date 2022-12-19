export class ContextFormDataParser {
	private rules = {
		static_select: (obj) => obj.selected_option.value,
		datepicker: (obj) => (obj.selected_date ? new Date(obj.selected_date) : null),
		multi_users_select: (obj) => obj.selected_users,
		checkboxes: (obj) => obj.selected_options[0],
		plain_text_input: (obj) => obj.value,
		multi_static_select: (obj) => obj.selected_options.map((opt) => opt.value),
	};

	parse(object: any, metadata?: string): any {
		const result = {};
		for (const block in object) {
			for (const action in object[block]) {
				result[action] = this.rules[object[block][action].type](object[block][action]);
			}
		}
		if (metadata && metadata.substr(0, 15) == 'privateMetadata') {
			const data = JSON.parse(metadata.substr(16));
			Object.assign(result, data);
		}
		Object.assign(result, {
			getPrivateMetadata: () => {
				return 'privateMetadata:' + JSON.stringify(result);
			},
		});
		return result;
	}
}
