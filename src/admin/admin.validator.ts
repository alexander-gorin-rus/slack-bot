import { ValidationError } from 'adminjs';
import { isNumberString } from 'class-validator';

type CallbackFunction<T> = (req: T) => void;

export class AdminValidator {
	static async invoker<T>(request: T, cbList: CallbackFunction<T>[]) {
		for (const cb of cbList) {
			await cb(request);
		}
	}

	static isPositive(field: string) {
		return (request) => {
			const value = Number(request.payload[field]);
			if (!request.payload[field]) return;
			const OK = isNumberString(request.payload[field]) && value > 0;
			if (!OK) {
				throw new ValidationError({
					[field]: {
						message: 'Это поле должно быть положительным числом.',
					},
				});
			}
		};
	}

	static requiredField(field: string) {
		return (request) => {
			if (!(typeof request.payload[field] === 'string' && request.payload[field].trim())) {
				throw new ValidationError({
					[field]: {
						message: 'Это поле не может быть пустым.',
					},
				});
			}
		};
	}

	static maxLength(field: string, length: number, message: string) {
		return (request) => {
			if (request.payload[field] && request.payload[field].length > length) {
				throw new ValidationError(
					{
						[field]: {
							message,
						},
					},
					{
						message,
					}
				);
			}
		};
	}

	static checkVacationDaysChange(field: string) {
		return (request) => {
			if (!(request.payload[field] || request.payload[field] !== 0)) {
				throw new ValidationError({
					[field]: {
						message: 'Это поле не может быть пустым.',
					},
				});
			}
		};
	}

	static minYear(field) {
		return (request) => {
			const { method, payload } = request;
			const minYear = 2008;

			if (method === 'post') {
				const year = new Date(payload.firstDay).getFullYear();
				if (year < minYear) {
					throw new ValidationError({
						[field]: {
							message: 'Выбери дату не раньше 1 января 2008 года.',
						},
					});
				}
			}
		};
	}
}
