import { Controller } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import https from 'https';
import { env } from '../configs/env';
import { SentryOverwatch } from './sentry.overwatch';

@Controller('healthcheck')
export class HealtchCheckController {
	@Cron(CronExpression.EVERY_MINUTE)
	@SentryOverwatch({ module: 'healthcheck', job: 'ping' })
	async ping() {
		if (env.HEALTH_CHECK_URI) {
			await https.get(env.HEALTH_CHECK_URI);
		}
	}
}
