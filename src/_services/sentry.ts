import * as Sentry from '@sentry/node';
import { env } from '../configs/env';
import { logger } from './logger';
import { Primitive } from '@sentry/types/dist/misc';

let sentryInitialized = false;

// eslint-disable-next-line no-constant-condition
if (false && env.SENTRY_DSN) {
	Sentry.init({ dsn: env.SENTRY_DSN });
	logger.debug('Sentry initialized');
	sentryInitialized = true;
}

export const captureException = (e: Error, tags?: Record<string, Primitive>): void => {
	if (tags) {
		sentryInitialized ? Sentry.captureException(e, { tags: tags }) : console.error(e, tags);
	} else {
		sentryInitialized ? Sentry.captureException(e) : console.error(e);
	}
};
