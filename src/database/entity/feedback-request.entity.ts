import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	OneToMany,
} from 'typeorm';
import { FeedbackRequestStatus } from '../util/feedback-request-status.enum';
import { Employee } from './employee.entity';
import { FeedbackRespondent } from './feedback-respondent.entity';

@Entity('feedback_requests')
export class FeedbackRequest {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	employeeId!: number;

	@Column({ type: 'date' })
	date!: Date;

	@Column({ type: 'varchar' })
	status!: FeedbackRequestStatus;

	@Column({ nullable: true })
	messageTsHR?: string;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;

	@ManyToOne(() => Employee, (employee) => employee.feedbackRequests)
	employee: Employee;

	@OneToMany(() => FeedbackRespondent, (feedbackRespondent) => feedbackRespondent.feedbackRequest, {
		cascade: true,
	})
	feedbackRespondents: FeedbackRespondent[];
}
