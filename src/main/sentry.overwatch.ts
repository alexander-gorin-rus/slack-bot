import * as Sentry from '@sentry/node';

export const SentryOverwatch = (tags?: Record<string, any>) => {
	return (target: any, propertyKey: string, propertyDescriptor: PropertyDescriptor) => {
		const originalMethod: () => Promise<void> = propertyDescriptor.value;
		propertyDescriptor.value = async function (...args: any[]) {
			try {
				return await originalMethod.apply(this, args);
			} catch (error) {
				process.env.SENTRY_DSN
					? Sentry.captureException(error, { tags: tags })
					: console.error(error, tags);
				throw error;
			}
		};
	};
};
