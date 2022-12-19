import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
	ManyToMany,
} from 'typeorm';
import { DayoffRequestStatus } from '../util/dayoff-request-status.enum';
import { DayoffRequestConfirm } from './dayoff-request-confirm.entity';
import { Employee } from './employee.entity';

@Entity('dayoff_requests')
export class DayoffRequest extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'uuid', nullable: true, generated: 'uuid' })
	globalId: string;

	@Column({ type: 'varchar' })
	status: DayoffRequestStatus = DayoffRequestStatus.CREATED;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@Column({ nullable: true })
	messageTs?: string;

	@Column({ nullable: true })
	channelId?: string;

	@Column({ nullable: true })
	counter?: number;

	@Column({ type: 'timestamp' })
	from!: Date;

	@Column()
	days!: number;

	@Column({ type: 'timestamp' })
	to!: Date;

	@Column({ type: 'boolean' })
	workingOff!: boolean;

	@Column({ type: 'varchar' })
	reason: string;

	@Column({ nullable: true })
	cancelReason?: string;

	@ManyToOne(() => Employee, (employee) => employee.dayoffRequests)
	employee: Employee;

	@Column({ nullable: true })
	employeeId: number;

	@OneToMany(() => DayoffRequestConfirm, (confirm) => confirm.dayoffRequest, {
		cascade: true,
	})
	confirms: DayoffRequestConfirm[];

	@ManyToMany(() => Employee, (pm) => pm.dayOffRequestsPms)
	pms: Employee[];

	@Column({ default: false })
	isRejectDayOff: boolean;
}
