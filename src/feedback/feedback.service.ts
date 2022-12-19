import { Injectable } from '@nestjs/common';
import { ActionsEnum } from '../configs/actions';
import { Employee } from '../database/entity/employee.entity';
import { divider } from '../templates/divider';
import { staticSelectCustom } from '../templates/staticSelect';
import { PlainTextOption } from '@slack/types';
import { mkdown } from '../templates/mkdown';
import { textArea } from '../templates/textInput';
import { multiSelectCustom } from '../templates/multiSelect';
import { datePicker } from '../templates/datePicker';
import { section } from '../templates/section';
import { Messages } from '../main/messages.service';
import { WebClient } from '@slack/web-api';
import { FeedbackQuestion } from '../database/entity/feedback-question.entity';
import { FeedbackAnswer } from '../database/entity/feedback-answer.entity';
import { FeedbackRespondent } from '../database/entity/feedback-respondent.entity';
import { FeedbackRespondentStatus } from '../database/util/feedback-respondent-status.enum';
import { button } from '../templates/button';
import { checkbox } from '../templates/checkbox';
import { messageOptions } from './options.select';
import { HelperService } from '../main/helper.service';
import { CreateFeedbackInterface } from './feedback.interface';

export function slackEmployee(employee: Pick<Employee, 'slackId' | 'position'>) {
	if (employee.position) return `<@${employee.slackId}> - ${employee.position}`;
	return `<@${employee.slackId}>`;
}

export function answerSort(a: FeedbackAnswer, b: FeedbackAnswer): number {
	if (!(a.question && b.question)) return 0;
	return a.question.order - b.question.order;
}

@Injectable()
export class FeedbackService {
	constructor(
		private messages: Messages,
		private client: WebClient,
		private helperService: HelperService
	) {}

	main(user: Employee, users: Employee[]): any {
		const authorOptions: PlainTextOption[] = users.map((userItem) => {
			return {
				text: {
					type: 'plain_text',
					text: userItem.realNameRu,
				},
				value: String(userItem.id),
			};
		});

		const employOptions: PlainTextOption[] = users.map((userItem) => {
			return {
				text: {
					type: 'plain_text',
					text: userItem.realNameRu,
				},
				value: String(userItem.id),
			};
		});

		const block = {
			blocks: [
				divider(),
				staticSelectCustom(
					authorOptions,
					'employeeTo',
					'employeeTo',
					'Выбрать сотрудника',
					'Выбрать сотрудника (по кому форма)'
				),
				multiSelectCustom(
					employOptions,
					'multiUserSelect',
					'employeeIds',
					'Выбрать сотрудника',
					'Кому отправить форму'
				),
				datePicker('Выбрать дату', 'До какой даты нужно дать ответ', 'date', 'date'),
			],
		};

		return {
			callback_id: ActionsEnum.GET_FEEDBACK_EMPLOYEE,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Отправить форму',
			},
			...block,
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
			submit: {
				type: 'plain_text',
				text: 'Отправить',
			},
		};
	}

	validateSubmit(form: CreateFeedbackInterface, userId: number) {
		type ErrorObject = Partial<Record<keyof CreateFeedbackInterface, string>>;
		const errors: ErrorObject = {};
		if (form.employeeTo === String(userId)) {
			errors.employeeTo = 'Ты не можешь запросить обратную связь на себя самого.';
		}
		const formDate = new Date(form.date);
		if (formDate.getTime() < Date.now()) {
			errors.date = 'Дата должна быть в будущем.';
		}
		if (!Object.keys(errors).length) return null; // empty
		return errors;
	}

	done(employeeSlackId: string, date: Date) {
		return {
			callback_id: 'feedback_success',
			clear_on_close: true,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Форма обратной связи',
			},
			blocks: [
				mkdown(`Форма о сборе обратной связи по <@${employeeSlackId}>  отправлена!`),
				divider(),
				section(
					'Ты можешь следить за ходом обработки формы на странице “Оценка по работе сотрудника”'
				),
				section(
					this.messages('Последний день сбора обратной связи {date, date, long}', { date: date })
				),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	survey(questions: FeedbackQuestion[], employee: Employee): any {
		const block = questions.map((question) => {
			if (!question.required) {
				return textArea(question.text, String(question.id), question.placeholder, ' ', true);
			}

			return textArea(question.text, String(question.id), question.placeholder);
		});

		return {
			callback_id: ActionsEnum.TAKE_SURVEY,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Оценка работы сотрудника',
			},
			blocks: [
				divider(),
				// eslint-disable-next-line max-len
				mkdown(
					`Компании важно твое мнение о работе ${slackEmployee(employee)}. \n` +
						' Просим тебя быть *максимально объективным и сохранить конфиденциальность этого процесса.*' +
						' (Если на некоторые вопросы у тебя нет ответа, поставь прочерк, но лучше хоть что-нибудь в них написать)'
				),
				divider(),
				...block,
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
			submit: {
				type: 'plain_text',
				text: 'Отправить',
			},
		};
	}

	surveyDone(employee: Employee): any {
		return {
			callback_id: 'feedback_success',
			clear_on_close: true,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Спасибо за отзыв!',
			},
			blocks: [
				divider(),
				mkdown(`Спасибо, ${employee.realNameRu}!`),
				mkdown('\n'),
				section('Твои ответы отправлены :thumbsup:'),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	evolutionEmployeeWork(feedbackRespondent: FeedbackRespondent[], authorEmployee: Employee): any {
		const respondentWithAnswer = feedbackRespondent.filter(
			(respondent) => respondent.status === FeedbackRespondentStatus.COMPLETED
		);
		const respondentWithoutAnswer = feedbackRespondent.filter(
			(respondent) => respondent.status === FeedbackRespondentStatus.WAIT
		);

		const blockRespondetWithAnswer = respondentWithAnswer
			.sort((a, b) => a.employee.realNameRu.localeCompare(b.employee.realNameRu))
			.map((respondent) => {
				return button(
					respondent.employee.realNameRu,
					ActionsEnum.VIEW_EDIT_FEEDBACK,
					JSON.stringify({ respondentId: respondent.id }),
					'default'
				);
			});

		const blockRespondetWithoutAnswer = respondentWithoutAnswer
			.sort((a, b) => a.employee.realNameRu.localeCompare(b.employee.realNameRu))
			.map((respondent) => {
				return button(
					respondent.employee.realNameRu,
					ActionsEnum.RESUBMIT_SURVEY,
					JSON.stringify({ respondentId: respondent.id })
				);
			});

		const headerRespondentWithoutAnswer = [];
		const headerRespondentWithAnswer = [];
		const dividerBlock = [];

		if (respondentWithoutAnswer.length) {
			headerRespondentWithoutAnswer.push(
				mkdown('Отправить повторный запрос сотрудникам, кто не заполнил форму')
			);
		}

		if (respondentWithAnswer.length) {
			headerRespondentWithAnswer.push(mkdown('Просмотреть ответы на форму'));
		}

		if (headerRespondentWithoutAnswer.length && respondentWithAnswer.length) {
			dividerBlock.push(divider());
		}

		const checkboxBlock = [];
		const lprDivider = [];

		if (!authorEmployee.head.isLPR) {
			checkboxBlock.push(
				checkbox(
					`${authorEmployee.head.realNameRu}`,
					'Добавить прямого руководителя в получатели',
					'askDirectHead'
				)
			);

			lprDivider.push(divider());
		}

		const messageTypeOptions: PlainTextOption[] = messageOptions.map((opt) => {
			return {
				text: {
					type: 'plain_text',
					text: opt.text,
				},
				value: String(opt.value),
			};
		});

		return {
			callback_id: ActionsEnum.VIEW_FEEDBACKS,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Оценка работы сотрудника',
			},
			blocks: [
				divider(),
				mkdown(`Оценка по работе сотрудника <@${authorEmployee.slackId}>`),
				...headerRespondentWithoutAnswer,
				mkdown('\n'),
				...blockRespondetWithoutAnswer,
				...dividerBlock,
				...headerRespondentWithAnswer,
				...blockRespondetWithAnswer,
				...lprDivider,
				mkdown('\n'),
				...checkboxBlock,
				staticSelectCustom(messageTypeOptions, 'typeMessage', 'typeMessage', 'Тип сообщения:', ' '),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
			submit: {
				type: 'plain_text',
				text: 'Отправить руководителям',
			},
		};
	}

	feedback(author: Employee, answers: FeedbackAnswer[]): any {
		const block = answers.map((answer) => {
			return textArea(
				answer.question.text,
				String(answer.id),
				answer.question.placeholder,
				answer.text
			);
		});

		return {
			callback_id: ActionsEnum.SAVE_FEEDBACK,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Просмотр фидбека',
			},
			blocks: [
				divider(),
				mkdown(`Ты просматриваешь фидбек по ${slackEmployee(author)}`),
				// eslint-disable-next-line max-len
				...block,
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
			submit: {
				type: 'plain_text',
				text: 'Сохранить',
			},
		};
	}

	saveFeedbackSuccess(): any {
		return {
			callback_id: 'feedback_save',
			clear_on_close: true,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Сохранение фидбека!',
			},
			blocks: [divider(), mkdown('\n'), section('Фидбек успешно сохранен :thumbsup:')],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	async feedbackView(
		authorEmployee: Employee,
		repondents: FeedbackRespondent[],
		LPR: Employee,
		isDirectHead: boolean,
		typeMessage: string,
		chief: Employee
	): Promise<any> {
		const emailOptions: PlainTextOption[] = [
			{
				text: {
					type: 'plain_text',
					text: process.env.MAILER_HR,
				},
				value: process.env.MAILER_HR,
			},
		];

		if (isDirectHead) {
			emailOptions.push({
				text: {
					type: 'plain_text',
					text: authorEmployee.head.email,
				},
				value: authorEmployee.head.email,
			});
		}

		if (LPR) {
			emailOptions.push({
				text: {
					type: 'plain_text',
					text: LPR.email,
				},
				value: LPR.email,
			});
		}

		if (chief && LPR.email !== chief.email) {
			emailOptions.push({
				text: {
					type: 'plain_text',
					text: chief.email,
				},
				value: chief.email,
			});
		}

		const respondentsSort = repondents
			.map((res) => {
				return {
					...res,
					feedbackAnswers: res.feedbackAnswers.sort(answerSort),
				};
			})
			.filter((res) => res.status === FeedbackRespondentStatus.COMPLETED);

		const block = respondentsSort.map((res) => {
			return mkdown(`<@${res.employee.slackId}>, ${res.employee.position} \n\n ${res.feedbackAnswers
				.map((answer) => `*${answer.question.text}*\n${answer.text}\n\n`)
				.join('')}
      `);
		});
		const authorSlack = await this.client.users.lookupByEmail({ email: authorEmployee.email });
		const slackPosition = authorSlack.user?.profile?.title;
		const commonText =
			`Сотрудник работает в компании ${this.messages(
				// eslint-disable-next-line max-len
				'{years} {years, plural, one {год} few {года} many {лет} other {}} {month} {month, plural, one {месяц} few {месяца} many {месяцев} other {}} {days} {days, plural, one {день} few {дня} many {дней} other {}}',
				{
					month: this.helperService.dateDiff(new Date(authorEmployee.firstDay), new Date()).months,
					days: this.helperService.dateDiff(new Date(authorEmployee.firstDay), new Date()).days,
					years: this.helperService.dateDiff(new Date(authorEmployee.firstDay), new Date()).years,
				}
			)}.\n` +
			'Текущий грейд: -\n' +
			`Должность в подписи, в трудовой: ${slackPosition || 'не указана'}, ${
				authorEmployee.position || 'не указана'
			}\n` +
			'Текущие договоренности с сотрудником ты можешь уточнить в финотделе.';

		return {
			callback_id: ActionsEnum.SEND_FEEDBACKS_SUCCESS,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Предпросмотр фидбеков',
			},
			blocks: [
				divider(),
				mkdown(`Ты просматриваешь отзыв по ${slackEmployee(authorEmployee)}`),
				multiSelectCustom(
					emailOptions,
					'multiUserSelect',
					'emails',
					'Получатели',
					'Получатели',
					emailOptions
				),
				textArea(
					' ',
					'description',
					' ',
					Number(typeMessage)
						? `У сотрудника ${authorEmployee.realNameRu} ${this.messages('{date, date, long}', {
								date: this.helperService.addMonths(
									new Date(authorEmployee.firstDay),
									Number(typeMessage)
								),
						  })} заканчивается испытательный срок.\n\n${commonText} Договоренности после испытательного срока можно уточнить в оффере.`
						: `На сотрудника ${authorEmployee.realNameRu} собраны отзывы о работе.\n\n${commonText}`
				),
				...block,
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
			submit: {
				type: 'plain_text',
				text: 'Отправить',
			},
		};
	}

	sendFeedbackSuccess(): any {
		return {
			callback_id: 'send_feedback_success',
			clear_on_close: true,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Отзывы отправлены!',
			},
			blocks: [divider(), mkdown('\n'), section(':email: Отзывы отправлены руководителям')],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	sendFeedbackError(): any {
		return {
			callback_id: 'send_feedback_error',
			clear_on_close: true,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Отзывы уже отправлены!',
			},
			blocks: [
				divider(),
				mkdown('\n'),
				section(':exclamation: Отзывы уже отправлены руководителям'),
			],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
		};
	}

	resubmitSurvey(): any {
		return {
			callback_id: ActionsEnum.RESUBMIT_SURVEY_DONE,
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Отправить форму',
			},
			blocks: [divider(), mkdown('\n'), section(':email: Отправить напоминание ?')],
			close: {
				type: 'plain_text',
				text: 'Закрыть',
			},
			submit: {
				type: 'plain_text',
				text: 'Отправить',
			},
		};
	}

	resubmitSurveySucceess(): any {
		return {
			callback_id: 'resubmitSurveySuccess',
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Отправить форму',
			},
			blocks: [divider(), mkdown('\n'), section(':email: Напоминание отправлено')],
		};
	}

	getListFeedbacks(blocks: any[]): any {
		return {
			callback_id: 'getListRespondents',
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'О ком собирается фидбек',
			},
			blocks: [...blocks],
		};
	}
}
