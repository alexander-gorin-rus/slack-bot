import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity('vacation_day_changes')
export class VacationDayChange extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'uuid', nullable: true, generated: 'uuid' })
	globalId: string;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

	@Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
	days: number;

	@Column('varchar', { nullable: false })
	reason: string;

	@Column({ nullable: true })
	employeeId: number;

	@Column({ nullable: true })
	calculatedMonth: string;

	@Column({ nullable: true })
	typeOfInitiator: string;

	@ManyToOne(() => Employee)
	employee: Employee;
}
