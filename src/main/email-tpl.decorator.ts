export const EmailTpl = function (code: string) {
	return (target, propertyKey) => {
		if (!Reflect.has(target, 'email-template')) {
			Reflect.set(target, 'email-template', new Map());
		}
		Reflect.get(target, 'email-template').set(propertyKey, code);
	};
};
