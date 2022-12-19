import { Controller } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WebClient } from '@slack/web-api';
import { ActionsEnum } from '../configs/actions';
import { FeedbackAnswer } from '../database/entity/feedback-answer.entity';
import { FeedbackRequest } from '../database/entity/feedback-request.entity';
import { FeedbackRespondent } from '../database/entity/feedback-respondent.entity';
import { EmployeeService } from '../database/service/employee.service';
import { FeedbackAmswerService } from '../database/service/feedback-answer.service';
import { FeedbackQuestionService } from '../database/service/feedback-question.service';
import { FeedbackRequestService } from '../database/service/feedback-request.service';
import { FeedbackRespondetService } from '../database/service/feedback-respondent.service';
import { FeedbackRequestStatus } from '../database/util/feedback-request-status.enum';
import { FeedbackRespondentStatus } from '../database/util/feedback-respondent-status.enum';
import { Context } from '../slack-bot/context/context';
import { Action } from '../slack-bot/decorator/action.decorator';
import { View } from '../slack-bot/decorator/view.decorator';
import { button } from '../templates/button';
import { header } from '../templates/header';
import { mkdown } from '../templates/mkdown';
import { FeedbackService, slackEmployee, answerSort } from './feedback.service';
import {
	FeedbackEditInterface,
	CompletedFeedbackInterface,
	CreateFeedbackInterface,
	EvolutionEnmployeeWorkInterface,
	ResubmitSurveyInterface,
	ResubmitSurveyDoneInterface,
	ViewFeedbacksInterface,
	SendFeedbackSuccessInterface,
} from './feedback.interface';
import { HelperService } from '../main/helper.service';
import { Messages } from '../main/messages.service';
import { EmailTpl } from '../main/email-tpl.decorator';
import { EmailSender } from '../main/email-message-option.interface';
import { divider } from '../templates/divider';

@Controller('feedback')
export class FeedbackController {
	// Отзыв испытательный срок
	@EmailTpl('sendEmailHeads') sendEmailTestingPeriod: EmailSender;
	// Отзыв о работе
	@EmailTpl('sendEmailReviewHeads') sendEmailWorkReview: EmailSender;

	constructor(
		private employeeService: EmployeeService,
		private feedbackService: FeedbackService,
		private feedbackRequestService: FeedbackRequestService,
		private feedbackRespondentService: FeedbackRespondetService,
		private feedbackAnswerService: FeedbackAmswerService,
		private feedbackQuestionService: FeedbackQuestionService,
		private helperService: HelperService,
		private client: WebClient,
		private messages: Messages
	) {}

	@Action(ActionsEnum.GET_FEEDBACK_ABOUT_WORK)
	async services({ user, views, ack }: Context) {
		await ack();

		await views.publish({
			user_id: user.slackId,
			view: {
				type: 'home',
				blocks: [
					header('Я готов помочь тебе собрать обратную связь по сотруднику'),
					mkdown('\n'),
					button('Начать сбор фидбеков', ActionsEnum.GET_FEEDBACK_EMPLOYEE),
					button('Отправить фидбеки руководителям ', ActionsEnum.EMPLOYEE_LIST_FEEDBACK),
					button('На главную', ActionsEnum.RETURN_HOME),
				],
			},
		});
	}

	@Action(ActionsEnum.GET_FEEDBACK_EMPLOYEE)
	async modalFeedbackEmployee({ ack, user, views, triggerId, formData }: Context) {
		ack();

		const employees = await this.employeeService.getAll();
		const view = this.feedbackService.main(user, employees);

		view.private_metadata = formData.getPrivateMetadata();
		await views.open({ trigger_id: triggerId, view });
	}

	@View(ActionsEnum.GET_FEEDBACK_EMPLOYEE)
	async modalCreateFeedback({
		ack,
		user,
		formData,
	}: Context<CreateFeedbackInterface>): Promise<void> {
		const errors = this.feedbackService.validateSubmit(formData, user.id);
		if (errors) {
			await ack({ response_action: 'errors', errors });
			return;
		}
		const employee = await this.employeeService.getById(+formData.employeeTo);

		const newFeedbackRequest = new FeedbackRequest();
		newFeedbackRequest.employeeId = employee.id;
		newFeedbackRequest.date = formData.date;
		newFeedbackRequest.status = FeedbackRequestStatus.WAIT;

		const feedbackRequestSave = (await this.feedbackRequestService.save(
			newFeedbackRequest
		)) as FeedbackRequest;

		for (const user of formData.employeeIds) {
			const userRespondent = await this.employeeService.getById(+user);
			const newFeedbackRespondent = new FeedbackRespondent();
			newFeedbackRespondent.feedbackRequestId = feedbackRequestSave.id;
			newFeedbackRespondent.employeeId = userRespondent.id;
			newFeedbackRespondent.status = FeedbackRespondentStatus.WAIT;

			const respondent = (await this.feedbackRespondentService.save(
				newFeedbackRespondent
			)) as FeedbackRespondent;
			const employeeRespondent = await this.feedbackRespondentService.getById(respondent.id, [
				'employee',
			]);

			const response = await this.client.chat.postMessage({
				text: 'Пройти опрос',
				channel: userRespondent.slackId,
				blocks: [
					mkdown(
						`Привет <@${
							employeeRespondent.employee.slackId
						}>! Компании важно твое мнение о работе ${slackEmployee(employee)}.` +
							'\n Просим тебя быть *максимально объективным и сохранить конфиденциальность этого процесса.*' +
							'\n (Если на некоторые вопросы у тебя нет ответа, поставь прочерк, но лучше хоть что-нибудь в них написать)'
					),
					mkdown(
						this.messages('Последний день сбора обратной связи {date, date, long}', {
							date: formData.date,
						})
					),
					button('Пройти опрос', ActionsEnum.TAKE_SURVEY, JSON.stringify(respondent)),
				],
			});

			await this.feedbackRespondentService.update(
				{ id: respondent.id },
				{
					channelId: response.channel,
					messageTs: response.ts,
				}
			);
		}

		const view = this.feedbackService.done(employee.slackId, formData.date);

		await ack({ response_action: 'push', view });
	}

	@Action(ActionsEnum.TAKE_SURVEY)
	async modalSurvey({ ack, formData, actionData, views, triggerId }: Context): Promise<void> {
		ack();

		const respondent = JSON.parse(actionData) as FeedbackRespondent;

		const authoEmployee = await this.feedbackRequestService.getById(respondent.feedbackRequestId, [
			'employee',
		]);
		const questions = await this.feedbackQuestionService.find({
			where: {
				active: true,
			},
			order: {
				order: 'ASC',
			},
		});

		const view = this.feedbackService.survey(questions, authoEmployee.employee);

		formData.respondentId = respondent.id;
		view.private_metadata = formData.getPrivateMetadata();
		await views.open({ trigger_id: triggerId, view });
	}

	@View(ActionsEnum.TAKE_SURVEY)
	async completeSurvey({
		ack,
		user,
		formData,
	}: Context<CompletedFeedbackInterface>): Promise<void> {
		for (const key in formData) {
			const newAnswer = new FeedbackAnswer();
			if (key !== 'respondentId' && key !== 'getPrivateMetadata') {
				newAnswer.text = formData[key];
				newAnswer.feedbackRespondentId = formData.respondentId;
				newAnswer.questionId = +key;

				await this.feedbackAnswerService.save(newAnswer);
			}
		}

		const respondent = await this.feedbackRespondentService.getById(formData.respondentId, [
			'feedbackRequest',
			'feedbackRequest.employee',
		]);

		if (respondent.threadTs) {
			await this.client.chat.delete({
				channel: respondent.channelId,
				ts: respondent.threadTs,
			});
		}

		await this.client.chat.delete({
			channel: respondent.channelId,
			ts: respondent.messageTs,
		});

		await this.feedbackRespondentService.update(
			{ id: formData.respondentId },
			{
				status: FeedbackRespondentStatus.COMPLETED,
			}
		);

		const view = this.feedbackService.surveyDone(user);

		await ack({ response_action: 'push', view });
	}

	@Action(ActionsEnum.EMPLOYEE_LIST_FEEDBACK)
	async getEmployeeListFeedback({ user, views, ack }: Context): Promise<void> {
		await ack();

		const getFeedback = await this.feedbackRequestService.find({
			relations: ['employee', 'feedbackRespondents'],
		});

		const blocks = [];

		const currentFeedback = getFeedback
			.filter((feedback) => feedback.status === FeedbackRequestStatus.WAIT)
			.map((fb) => ({ ...fb, employee: fb.employee.realNameRu }))
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

		const groupByDate = this.helperService.groupBy(currentFeedback, 'date');

		for (const key in groupByDate) {
			blocks.push(mkdown(this.messages('До {date, date, long}', { date: new Date(key) })));
			blocks.push(divider());

			groupByDate[key]
				.sort((a, b) => a.employee.localeCompare(b.employee))
				.forEach((feedback: FeedbackRequest) => {
					const feedbackWithAnswer = feedback.feedbackRespondents.filter(
						(r) => r.status === FeedbackRespondentStatus.COMPLETED
					);

					blocks.push(
						button(
							`${feedback.employee} (${feedbackWithAnswer.length}/${feedback.feedbackRespondents.length})`,
							ActionsEnum.EVOLUTION_EMPLOYEE_WORK,
							JSON.stringify({ feedbackId: feedback.id })
						)
					);
				});
		}

		await views.publish({
			user_id: user.slackId,
			view: {
				type: 'home',
				blocks: [
					header('Список сотрудников, о ком собирается фидбек'),
					mkdown('\n'),
					...blocks,
					button('Назад', ActionsEnum.GET_FEEDBACK_ABOUT_WORK),
				],
			},
		});
	}

	@Action(ActionsEnum.EVOLUTION_EMPLOYEE_WORK)
	async getEvolutionEmloyeeWork({
		views,
		actionData,
		ack,
		triggerId,
		formData,
	}: Context): Promise<void> {
		await ack();

		const { feedbackId, isModal } = JSON.parse(actionData) as EvolutionEnmployeeWorkInterface;
		const getEmployeeRespondents = await this.feedbackRespondentService.find({
			where: { feedbackRequestId: feedbackId },
			relations: ['employee'],
		});
		const authorEmployee = await this.feedbackRequestService.getById(feedbackId, [
			'employee',
			'employee.head',
			'employee.head.head',
		]);

		const view = this.feedbackService.evolutionEmployeeWork(
			getEmployeeRespondents,
			authorEmployee.employee
		);

		formData.feedbackId = feedbackId;
		formData.isModal = isModal;
		view.private_metadata = formData.getPrivateMetadata();

		await views.open({ trigger_id: triggerId, view });
	}

	@Action(ActionsEnum.VIEW_EDIT_FEEDBACK)
	async modalEditFeedback({ ack, formData, actionData, views, triggerId }: Context): Promise<void> {
		await ack();

		const { respondentId } = JSON.parse(actionData) as FeedbackEditInterface;

		const respondent = await this.feedbackRespondentService.getById(respondentId, [
			'feedbackRequest',
			'feedbackRequest.employee',
		]);

		const answers = await this.feedbackAnswerService.find({
			where: { feedbackRespondentId: respondentId },
			relations: ['question'],
		});

		const view = this.feedbackService.feedback(
			respondent.feedbackRequest.employee,
			answers.sort(answerSort)
		);

		formData.respondentId = respondentId;
		view.private_metadata = formData.getPrivateMetadata();
		await views.push({ trigger_id: triggerId, view });
	}

	@View(ActionsEnum.SAVE_FEEDBACK)
	async saveFeedback({ ack, formData }: Context): Promise<void> {
		for (const key in formData) {
			if (key !== 'respondentId' && key !== 'getPrivateMetadata') {
				await this.feedbackAnswerService.update(
					{ id: Number(key) },
					{
						text: formData[key],
					}
				);
			}
		}

		const view = this.feedbackService.saveFeedbackSuccess();

		await ack({ response_action: 'push', view });
	}

	@View(ActionsEnum.VIEW_FEEDBACKS)
	async modalEvolutionEmloyeeWork({
		ack,
		formData,
	}: Context<ViewFeedbacksInterface>): Promise<void> {
		const authoEmployee = await this.feedbackRequestService.getById(formData.feedbackId, [
			'employee',
			'employee.head',
			'employee.head.head',
			'employee.position',
			'employee.head.position',
			'employee.head.head.position',
		]);

		const getRespondents = await this.feedbackRespondentService.find({
			where: { feedbackRequestId: formData.feedbackId },
			relations: ['employee', 'employee.head', 'feedbackAnswers', 'feedbackAnswers.question'],
		});

		const { askDirectHead } = formData;
		const LPR = await this.helperService.getLprRecursively(authoEmployee.employee.head);

		const chief = await this.helperService.getChiefRecursively(authoEmployee.employee.head);

		const view = await this.feedbackService.feedbackView(
			authoEmployee.employee,
			getRespondents,
			LPR,
			askDirectHead?.value === 'ok',
			formData.typeMessage,
			chief
		);

		view.private_metadata = formData.getPrivateMetadata();
		await ack({ response_action: 'push', view });
	}

	@View(ActionsEnum.SEND_FEEDBACKS_SUCCESS)
	async sendFeedbackSuccess({
		ack,
		formData,
	}: Context<SendFeedbackSuccessInterface>): Promise<void> {
		const findFeedbackRequest = await this.feedbackRequestService.findOne({
			id: formData.feedbackId,
		});

		if (findFeedbackRequest.status === FeedbackRequestStatus.COMPLETED) {
			const view = this.feedbackService.sendFeedbackError();

			await ack({ response_action: 'push', view });
		} else {
			await this.feedbackRequestService.update(
				{ id: formData.feedbackId },
				{
					status: FeedbackRequestStatus.COMPLETED,
				}
			);

			const feedbackRequest = await this.feedbackRequestService.getById(formData.feedbackId, [
				'employee',
				'feedbackRespondents',
				'feedbackRespondents.employee',
				'feedbackRespondents.feedbackAnswers',
				'feedbackRespondents.feedbackAnswers.question',
			]);

			feedbackRequest.feedbackRespondents.forEach(async (respondent) => {
				await this.feedbackRespondentService.update(
					{ id: respondent.id },
					{
						status: FeedbackRespondentStatus.COMPLETED,
					}
				);

				await this.client.chat.update({
					text: 'Пройти опрос',
					channel: respondent.channelId,
					ts: respondent.messageTs,
					blocks: [
						mkdown(
							`Привет <@${
								respondent.employee.slackId
							}>! Компании важно твое мнение о работе ${slackEmployee(feedbackRequest.employee)}.` +
								'\n Просим тебя быть *максимально объективным и сохранить конфиденциальность этого процесса.* \n' +
								'(Если на некоторые вопросы у тебя нет ответа, поставь прочерк, но лучше хоть что-нибудь в них написать)'
						),
						mkdown(
							this.messages('Последний день сбора обратной связи {date, date, long}', {
								date: feedbackRequest.date,
							})
						),
					],
				});
			});

			// group answers by respondents
			const answersList = feedbackRequest.feedbackRespondents
				// filter by completed answers
				.filter((respondent) => respondent.status === FeedbackRespondentStatus.COMPLETED)
				// map to plain object
				.map((respondent) =>
					respondent.feedbackAnswers.map((answer) => ({
						respondentName: respondent.employee.realNameRu,
						question: answer.question.text,
						answer: answer.text,
					}))
				)
				// merge [][] to []
				.reduce((list, item) => list.concat(item), []);
			// group by question
			type AnswerObject = Record<string, { respondentName: string; answer: string }[]>;
			const answers: AnswerObject = answersList.reduce((answerObject: AnswerObject, answer) => {
				const question = answer.question;
				if (!Object.keys(answerObject).includes(question)) answerObject[question] = [];
				answerObject[question].push({
					respondentName: answer.respondentName,
					answer: answer.answer,
				});
				return answerObject;
			}, {});
			const employee = feedbackRequest.employee;
			const authorSlack = await this.client.users.lookupByEmail({ email: employee.email });
			const slackPosition = authorSlack.user?.profile?.title;
			const emails = formData.emails;
			const nMonths = Number(formData.typeMessage);
			const isWorkReviewEmail = nMonths === 0;
			const templateData = {
				realNameRu: employee.realNameRu,
				// конец испытательного срока
				dateEnd: this.messages('{date, date, long}', {
					date: this.helperService.addMonths(new Date(employee.firstDay), nMonths),
				}),
				// начало работы
				dateStart: this.messages(
					// eslint-disable-next-line max-len
					'{years} {years, plural, one {год} few {года} many {лет} other {}} {month} {month, plural, one {месяц} few {месяца} many {месяцев} other {}} {days} {days, plural, one {день} few {дня} many {дней} other {}}',
					{
						month: this.helperService.dateDiff(new Date(employee.firstDay), new Date()).months,
						days: this.helperService.dateDiff(new Date(employee.firstDay), new Date()).days,
						years: this.helperService.dateDiff(new Date(employee.firstDay), new Date()).years,
					}
				),
				position: employee.position || 'не указана',
				slackPosition: slackPosition,
				answers: answers,
			};
			if (isWorkReviewEmail) {
				this.sendEmailWorkReview(emails, templateData);
			} else {
				this.sendEmailTestingPeriod(emails, templateData);
			}

			if (formData.isModal) {
				await this.client.chat.delete({
					channel: process.env.HR_CHANNEL,
					ts: feedbackRequest.messageTsHR,
				});
			}

			const view = this.feedbackService.sendFeedbackSuccess();

			await ack({ response_action: 'push', view });
		}
	}

	@Action(ActionsEnum.RESUBMIT_SURVEY)
	async resubmitSurvey({ ack, actionData, formData, triggerId, views }: Context): Promise<void> {
		await ack();

		const { respondentId } = JSON.parse(actionData) as ResubmitSurveyInterface;

		const view = this.feedbackService.resubmitSurvey();

		formData.respondentId = respondentId;
		view.private_metadata = formData.getPrivateMetadata();
		await views.push({ trigger_id: triggerId, view });
	}

	@View(ActionsEnum.RESUBMIT_SURVEY_DONE)
	async resubmitSurveyDone({ ack, formData }: Context<ResubmitSurveyDoneInterface>): Promise<void> {
		const respondent = await this.feedbackRespondentService.getById(formData.respondentId, [
			'employee',
			'feedbackRequest',
			'feedbackRequest.employee',
		]);

		const daysLeft = this.helperService.dayDiff(
			new Date(respondent.feedbackRequest.date),
			new Date()
		);

		if (daysLeft > 1) {
			if (respondent.threadTs) {
				await this.client.chat.delete({
					ts: respondent.threadTs,
					channel: respondent.channelId,
				});
			}

			const res = await this.client.chat.postMessage({
				text: 'Пройти опрос',
				thread_ts: respondent.messageTs,
				channel: respondent.employee.slackId,
				blocks: [
					mkdown(
						`Привет <@${
							respondent.employee.slackId
						}>! Компании важно твое мнение о работе ${slackEmployee(
							respondent.feedbackRequest.employee
						)}.` +
							'\n Просим тебя быть *максимально объективным и сохранить конфиденциальность этого процесса.*' +
							'\n (Если на некоторые вопросы у тебя нет ответа, поставь прочерк, но лучше хоть что-нибудь в них написать)'
					),
					mkdown(
						this.messages(':warning: Последний день сбора обратной связи {date, date, long}', {
							date: respondent.feedbackRequest.date,
						})
					),
				],
			});

			await this.feedbackRespondentService.update(
				{ id: respondent.id },
				{
					channelId: res.channel,
					threadTs: res.ts,
				}
			);
		} else {
			if (respondent.threadTs) {
				await this.client.chat.delete({
					ts: respondent.threadTs,
					channel: respondent.channelId,
				});
			}

			const response = await this.client.chat.postMessage({
				text: 'Пройти опрос',
				thread_ts: respondent.messageTs,
				channel: respondent.employee.slackId,
				blocks: [
					mkdown(
						`Привет <@${
							respondent.employee.slackId
						}>! Компании важно твое мнение о работе ${slackEmployee(
							respondent.feedbackRequest.employee
						)}.` +
							'\n Просим тебя быть *максимально объективным и сохранить конфиденциальность этого процесса.*' +
							'\n (Если на некоторые вопросы у тебя нет ответа, поставь прочерк, но лучше хоть что-нибудь в них написать)'
					),
					mkdown(
						this.messages(':exclamation: Последний день сбора обратной связи {date, date, long}', {
							date: respondent.feedbackRequest.date,
						})
					),
				],
			});

			await this.feedbackRespondentService.update(
				{ id: respondent.id },
				{
					channelId: response.channel,
					threadTs: response.ts,
				}
			);
		}

		const view = this.feedbackService.resubmitSurveySucceess();

		await ack({ response_action: 'update', view });
	}
	@Cron('0 0 12 * * *')
	async checkResponseSurvey() {
		const feedbackRequests = await this.feedbackRequestService.find({
			where: { status: FeedbackRequestStatus.WAIT },
			relations: ['feedbackRespondents', 'employee', 'feedbackRespondents.employee'],
		});
		const today = new Date(new Date().setHours(0, 0, 0, 0));
		const workDay = await this.helperService.prodCalendarCalculator(today, 1, 'vac');

		if (workDay.decision) {
			if (feedbackRequests.length) {
				feedbackRequests.forEach(async (feedbackRequest) => {
					const daysLeft = this.helperService.dayDiff(new Date(feedbackRequest.date), today);
					if (daysLeft % 3 === 0 || daysLeft <= 1 || daysLeft >= 0) {
						for (const respondent of feedbackRequest.feedbackRespondents) {
							if (respondent.status === FeedbackRespondentStatus.WAIT) {
								if (daysLeft <= 1) {
									if (respondent.threadTs) {
										await this.client.chat.delete({
											ts: respondent.threadTs,
											channel: respondent.channelId,
										});
									}

									const response = await this.client.chat.postMessage({
										text: 'Пройти опрос',
										channel: respondent.employee.slackId,
										thread_ts: respondent.messageTs,
										blocks: [
											mkdown(
												`Привет <@${
													respondent.employee.slackId
												}>! Компании важно твое мнение о работе ${slackEmployee(
													feedbackRequest.employee
												)}.` +
													'\n Просим тебя быть *максимально объективным и сохранить конфиденциальность этого процесса.*' +
													'\n (Если на некоторые вопросы у тебя нет ответа, поставь прочерк, но лучше хоть что-нибудь в них написать)'
											),
											mkdown(
												this.messages(
													':exclamation: Последний день сбора обратной связи {date, date, long}',
													{ date: feedbackRequest.date }
												)
											),
										],
									});

									await this.feedbackRespondentService.update(
										{ id: respondent.id },
										{
											channelId: response.channel,
											threadTs: response.ts,
										}
									);
								} else {
									if (respondent.threadTs) {
										await this.client.chat.delete({
											ts: respondent.threadTs,
											channel: respondent.channelId,
										});
									}

									const response = await this.client.chat.postMessage({
										text: 'Пройти опрос',
										channel: respondent.employee.slackId,
										thread_ts: respondent.messageTs,
										blocks: [
											mkdown(
												`Привет <@${
													respondent.employee.slackId
												}>! Компании важно твое мнение о работе ${slackEmployee(
													feedbackRequest.employee
												)}.` +
													'\n Просим тебя быть *максимально объективным и сохранить конфиденциальность этого процесса.*' +
													'\n (Если на некоторые вопросы у тебя нет ответа, поставь прочерк, но лучше хоть что-нибудь в них написать)'
											),
											mkdown(
												this.messages(
													':warning: Последний день сбора обратной связи {date, date, long}',
													{ date: feedbackRequest.date }
												)
											),
										],
									});

									await this.feedbackRespondentService.update(
										{ id: respondent.id },
										{
											channelId: response.channel,
											threadTs: response.ts,
										}
									);
								}
							}
						}
					}
				});
			}
		}
	}

	@Cron('0 0 12 * * *')
	async notificationHr() {
		const feedbackRequests = await this.feedbackRequestService.find({
			where: { status: FeedbackRequestStatus.WAIT },
			relations: ['feedbackRespondents', 'employee', 'feedbackRespondents.employee'],
		});
		const today = new Date(new Date().setHours(0, 0, 0, 0));
		const workDay = await this.helperService.prodCalendarCalculator(today, 1, 'vac');

		if (workDay.decision) {
			if (feedbackRequests.length) {
				feedbackRequests.forEach(async (feedbackRequest) => {
					const daysLeft = this.helperService.dayDiff(new Date(feedbackRequest.date), today);
					if (daysLeft === 3) {
						const res = await this.client.chat.postMessage({
							text: 'Посмотреть кто ответил',
							channel: process.env.HR_CHANNEL,
							blocks: [
								mkdown(':wave: Всем привет!'),
								mkdown(
									`:warning: Сбор фидбека о работе <@${feedbackRequest.employee.slackId}> закончится через 3 дня. Убедитесь, что все опрашиваемые дали ответ.`
								),
								button(
									'Посмотреть, кто ответил',
									ActionsEnum.EVOLUTION_EMPLOYEE_WORK,
									JSON.stringify({
										feedbackId: feedbackRequest.id,
										isModal: true,
									})
								),
							],
						});

						await this.feedbackRequestService.update(
							{ id: feedbackRequest.id },
							{
								messageTsHR: res.ts,
							}
						);
					}

					if (daysLeft === 1) {
						const res = await this.client.chat.postMessage({
							text: 'Посмотреть кто ответил',
							channel: process.env.HR_CHANNEL,
							blocks: [
								mkdown(':wave: Всем привет!'),
								mkdown(
									`:exclamation: Сбор фидбека о работе <@${feedbackRequest.employee.slackId}> закончится через 1 день.` +
										' Убедитесь, что все опрашиваемые дали ответ и подготовьтесь отправить отчет руководителю сотрудника.'
								),
								button(
									'Посмотреть, кто ответил',
									ActionsEnum.EVOLUTION_EMPLOYEE_WORK,
									JSON.stringify({
										feedbackId: feedbackRequest.id,
										isModal: true,
									})
								),
							],
						});
						await this.feedbackRequestService.update(
							{ id: feedbackRequest.id },
							{
								messageTsHR: res.ts,
							}
						);
					}
				});
			}
		}
	}
}
