import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { FeedbackRespondentStatus } from '../util/feedback-respondent-status.enum';
import { Employee } from './employee.entity';
import { FeedbackAnswer } from './feedback-answer.entity';
import { FeedbackRequest } from './feedback-request.entity';

@Entity('feedback_respondent')
export class FeedbackRespondent {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'int' })
	feedbackRequestId!: number;

	@Column({ type: 'int' })
	employeeId!: number;

	@Column({ type: 'varchar' })
	status: FeedbackRespondentStatus;

	@Column({ type: 'varchar', nullable: true })
	channelId?: string;

	@Column({ type: 'varchar', nullable: true })
	messageTs?: string;

	@Column({ type: 'varchar', nullable: true })
	threadTs?: string;

	@CreateDateColumn()
	createdAt!: Date;

	@ManyToOne(() => FeedbackRequest, (feedbackRequest) => feedbackRequest.feedbackRespondents)
	feedbackRequest: FeedbackRequest;

	@ManyToOne(() => Employee, (employee) => employee.feedbackRequests)
	employee: Employee;

	@OneToMany(() => FeedbackAnswer, (feedbackAnswer) => feedbackAnswer.feedbackRespondent)
	feedbackAnswers: FeedbackAnswer[];
}
