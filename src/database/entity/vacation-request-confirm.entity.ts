import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { VacationRequest } from './vacation-request.entity';
import { Employee } from './employee.entity';
import { VacationRequestConfirmStatus } from '../util/vacation-request-confirm-status.enum';

@Entity('vacation_request_confirms')
export class VacationRequestConfirm extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar' })
	status: VacationRequestConfirmStatus = VacationRequestConfirmStatus.WAIT;

	@Column({ nullable: true })
	messageTs?: string;

	@CreateDateColumn()
	createdAt!: Date;

	@Column({ nullable: true })
	counter?: number;

	@ManyToOne(() => VacationRequest, (vacationRequest) => vacationRequest.confirms)
	vacationRequest: VacationRequest;

	@ManyToOne(() => Employee)
	manager: Employee;

	@Column({ nullable: true })
	chanelId?: string;
}
