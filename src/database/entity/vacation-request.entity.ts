import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { VacationRequestConfirm } from './vacation-request-confirm.entity';
import { VacationRequestStatus } from '../util/vacation-request-status.enum';

@Entity('vacation_requests')
export class VacationRequest extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'uuid', nullable: true, generated: 'uuid' })
	globalId: string;

	@Column({ type: 'varchar' })
	status: VacationRequestStatus = VacationRequestStatus.CREATED;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@Column({ nullable: true })
	messageTs?: string;

	@Column({ nullable: true })
	channelId?: string;

	@Column({ nullable: true })
	approve?: boolean;

	@Column({ nullable: true })
	counter?: number;

	@Column({ nullable: true })
	isNotified?: boolean;

	@Column({ type: 'timestamp' })
	from!: Date;

	@Column({ type: 'timestamp' })
	to: Date;

	@Column()
	days!: number;

	@Column({ type: 'text', nullable: true })
	reason?: string;

	@Column({ type: 'text', nullable: true })
	cancelReason?: string;

	@ManyToOne(() => Employee, (employee) => employee.vacationRequests)
	employee: Employee;

	@Column({ nullable: true })
	employeeId: number;

	@OneToMany(() => VacationRequestConfirm, (confirm) => confirm.vacationRequest, { cascade: true })
	confirms: VacationRequestConfirm[];

	@Column({ default: false })
	isRejectVacation: boolean;
}
