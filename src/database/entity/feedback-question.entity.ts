import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { FeedbackAnswer } from './feedback-answer.entity';

@Entity('feedback_question')
export class FeedbackQuestion {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'text' })
	text!: string;

	@Column({ type: 'text', default: '' })
	placeholder: string;

	@Column({ type: 'int' })
	order!: number;

	@Column({ type: 'bool', default: false })
	active: boolean;

	@Column({ type: 'bool', default: true })
	required: boolean;

	@OneToMany(() => FeedbackAnswer, (feedbackAnswer) => feedbackAnswer.question)
	feedbackAnswer: FeedbackAnswer;
}
