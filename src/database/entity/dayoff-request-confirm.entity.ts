import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { DayoffRequestConfirmStatus } from '../util/dayoff-request-confirm-status.enum';
import { DayoffRequest } from './dayoff-request.entity';
import { Employee } from './employee.entity';

@Entity('dayoff_request_confirms')
export class DayoffRequestConfirm extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar' })
	status: DayoffRequestConfirmStatus = DayoffRequestConfirmStatus.WAIT;

	@Column({ nullable: true })
	messageTs?: string;

	@CreateDateColumn()
	createdAt!: Date;

	@Column({ nullable: true })
	counter?: number;

	@ManyToOne(() => DayoffRequest, (dayoffRequest) => dayoffRequest.confirms)
	dayoffRequest: DayoffRequest;

	@ManyToOne(() => Employee)
	manager: Employee;

	@Column({ nullable: true })
	channelId?: string;
}
