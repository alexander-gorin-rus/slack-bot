import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { FeedbackQuestion } from './feedback-question.entity';
import { FeedbackRespondent } from './feedback-respondent.entity';

@Entity('feedback_answer')
export class FeedbackAnswer {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	feedbackRespondentId: number;

	@Column()
	questionId: number;

	@Column({ type: 'text' })
	text: string;

	@ManyToOne(() => FeedbackRespondent, (feedbackRespondent) => feedbackRespondent.feedbackAnswers)
	feedbackRespondent: FeedbackRespondent;

	@ManyToOne(() => FeedbackQuestion, (feedbackQuestion) => feedbackQuestion.feedbackAnswer, {
		cascade: true,
	})
	question: FeedbackQuestion;
}
