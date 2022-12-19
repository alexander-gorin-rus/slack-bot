import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToMany,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { DayoffRequest } from './dayoff-request.entity';
import { FeedbackRequest } from './feedback-request.entity';
import { FeedbackRespondent } from './feedback-respondent.entity';
import { DaysMessages } from './messages.entity';
import { SellRequest } from './sell.entity';
import { VacationRequest } from './vacation-request.entity';
import { Position } from './positions.entity';
import { SoloProprietorStatus } from '../util/employee-solo-proprietor-status.enum';
import { STATUS_NO_EXPIRATION } from '../../history/history.interface';

export const DEFAULT_VACATION_DAYS_COEFFICIENT = 2.33;

@Entity('employees')
export class Employee extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'uuid', nullable: true })
	globalId: string;

	@Column()
	email!: string;

	@Column('varchar', { nullable: false })
	realNameRu: string;

	@ManyToOne(() => Employee)
	head!: Employee;

	@Column({ nullable: true })
	headId?: number;

	@Column({ default: true })
	pmApprove!: boolean;

	@Column({ default: false })
	isPm!: boolean;

	@Column({ type: 'int', nullable: true })
	grade?: number;

	@Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
	days: number;

	@Column({ nullable: true, unique: true })
	slackId?: string;

	@Column({ nullable: true })
	city?: string;

	@Column({ type: 'int', default: SoloProprietorStatus.DEFAULT_EMPLOYEE })
	SPStatus: SoloProprietorStatus;

	@Column({ nullable: true, type: 'date' })
	firstDay?: Date;

	@Column({ type: 'bool', default: false })
	active: boolean;

	@Column({ type: 'bool', default: false })
	hasNoVacataionDays: boolean;

	@Column({ type: 'decimal', default: DEFAULT_VACATION_DAYS_COEFFICIENT })
	vacationDaysPerMonth: number;

	@Column({ type: 'bool', default: false })
	isHR: boolean;

	@Column({ type: 'bool', default: false })
	isLPR: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@OneToMany(() => VacationRequest, (vacationRequests) => vacationRequests.employee)
	vacationRequests: VacationRequest[];

	@OneToMany(() => DayoffRequest, (dayoffRequests) => dayoffRequests.employee)
	dayoffRequests: DayoffRequest[];

	@OneToMany(() => DaysMessages, (daysMessages) => daysMessages.employee)
	daysMessages: DaysMessages[];

	@OneToMany(() => SellRequest, (sellRequests) => sellRequests.employee)
	sellRequests: SellRequest[];

	@OneToMany(() => FeedbackRequest, (feedbackRequest) => feedbackRequest.employee)
	feedbackRequests: FeedbackRequest[];

	@OneToMany(() => FeedbackRespondent, (feedbackRespondent) => feedbackRespondent.employee)
	feedbackRespondent: FeedbackRespondent[];

	@ManyToMany(() => DayoffRequest, (dayoffRequest) => dayoffRequest.pms)
	dayOffRequestsPms: DayoffRequest[];

	@ManyToOne(() => Position, (position) => position.employee)
	position: Position;

	@Column({
		comment: 'Status expiration, 0 means infinite',
		nullable: true,
		default: STATUS_NO_EXPIRATION,
	})
	slack_status_expiration: number;

	@Column({ comment: 'Slack status text', default: '', nullable: true })
	slack_status_text: string;

	@Column({ comment: 'Slack status emoji', default: '', nullable: true })
	slack_status_emoji: string;
}
