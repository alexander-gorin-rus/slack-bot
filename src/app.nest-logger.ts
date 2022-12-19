import { logger } from './app.logger';
import { LoggerService } from '@nestjs/common';

export class AppNestLogger implements LoggerService {
	/**
	 * Write a 'log' level log.
	 */
	log(message: any, ...optionalParams: any[]) {
		logger.info(message + ' ' + JSON.stringify(optionalParams));
	}

	/**
	 * Write an 'error' level log.
	 */
	error(message: any, ...optionalParams: any[]) {
		logger.error(message + ' ' + JSON.stringify(optionalParams));
	}

	/**
	 * Write a 'warn' level log.
	 */
	warn(message: any, ...optionalParams: any[]) {
		logger.warn(message + ' ' + JSON.stringify(optionalParams));
	}

	/**
	 * Write a 'debug' level log.
	 */
	debug?(message: any, ...optionalParams: any[]) {
		logger.debug(message + ' ' + JSON.stringify(optionalParams));
	}

	/**
	 * Write a 'verbose' level log.
	 */
	verbose?(message: any, ...optionalParams: any[]) {
		logger.debug('verbose: ' + message + ' ' + JSON.stringify(optionalParams));
	}
}
