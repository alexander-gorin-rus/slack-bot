import { Logger, LogLevel } from '@slack/web-api';
import { env } from '../configs/env';
import { createLogger, format, transports } from 'winston';
import LokiTransport from 'winston-loki';
import TransportStream from 'winston-transport';
import { AnyMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { captureException } from './sentry';

const { combine, printf } = format;

const options = {
	timeout: 5000,
	level: 'debug',
	format: combine(printf(({ level, message }) => `[${level}] ${message}`)),
	transports: [new transports.Console() as TransportStream],
};

if (env.LOKI_URL && env.LOKI_JOB_NAME) {
	options.transports.push(
		new LokiTransport({
			host: env.LOKI_URL,
			basicAuth: env.LOKI_AUTH,
			labels: { job: env.LOKI_JOB_NAME },
		})
	);
}

export const logger = createLogger(options);

export class BoltLogger implements Logger {
	debug(...msg: string[]): void {
		logger.debug(msg.join('. '));
	}
	info(...msg: string[]): void {
		logger.info(msg.join('. '));
	}
	warn(...msg: string[]): void {
		logger.warn(msg.join('. '));
	}
	error(...msg: string[]): void {
		logger.error(msg.join('. '));
	}

	setLevel(level: LogLevel): void {
		logger.debug('Setlevel is called: ' + level);
	}

	getLevel(): LogLevel {
		logger.debug('GetLevel is called');
		return LogLevel.DEBUG;
	}

	setName(name: string): void {
		logger.debug('SetName is called: ' + name);
	}
}

export const MiddlewareLogger = async (
	argsMiddleware: AnyMiddlewareArgs & AllMiddlewareArgs
): Promise<void> => {
	let action = argsMiddleware.payload.type;
	if (action === 'button') {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		action = argsMiddleware.payload?.action_id;
	}
	const start = new Date();
	try {
		await argsMiddleware.next();
		const end = new Date();
		const duration = Number(end) - Number(start);
		const latency = getLatency(duration);
		logger.info({
			message: 'call api method: ' + action,
			labels: { action, duration, latency },
		});
	} catch (e) {
		captureException(e, { action });
		const end = new Date();
		const duration = Number(end) - Number(start);
		const latency = getLatency(duration);
		logger.error({
			message: 'call api method: ' + action + ' Error: ' + e.message,
			labels: { action, duration, latency },
		});
	}
};

const getLatency = (duration: number): string => {
	const latencyVector = env.LOKI_LATENCY_VECTOR.split(',').map((i) => Number(i));
	if (duration <= latencyVector[0]) {
		return 'Very fast';
	}
	if (duration <= latencyVector[1]) {
		return 'Fast';
	}
	if (duration <= latencyVector[2]) {
		return 'Normal';
	}
	if (duration <= latencyVector[3]) {
		return 'Slow';
	}
	return 'Very slow';
};
