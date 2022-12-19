import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Employee } from './employee.entity';

@Entity('days_messages')
export class DaysMessages {
	@PrimaryGeneratedColumn()
	id: number;

	@CreateDateColumn()
	createdAt!: Date;

	@Column()
	messageTs!: string;

	@ManyToOne(() => Employee, (employee) => employee.daysMessages)
	employee: Employee;
}
