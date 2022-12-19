import { Logger, LogLevel } from '@slack/web-api';
import { logger } from './app.logger';

export class AppBotLogger implements Logger {
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
