import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { SellRequestStatus } from '../util/sell-request-status.enum';
import { Employee } from './employee.entity';

@Entity('sell_requests')
export class SellRequest extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'uuid', nullable: true, generated: 'uuid' })
	globalId: string;

	@CreateDateColumn()
	createdAt!: Date;

	@Column({ type: 'date' })
	from!: Date;

	@Column()
	days!: number;

	@Column({ nullable: true })
	vacationId?: number;

	@Column({ type: 'date' })
	to!: Date;

	@Column({ type: 'varchar' })
	status: SellRequestStatus = SellRequestStatus.PLANNED;

	@Column({ type: 'text', nullable: true })
	reason!: string;

	@Column({ type: 'text', nullable: true })
	cancelReason!: string;

	@ManyToOne(() => Employee, (employee) => employee.sellRequests)
	employee: Employee;

	@Column({ nullable: true })
	employeeId: number;
}
