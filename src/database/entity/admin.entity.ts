import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Employee } from './employee.entity';

@Entity('admins')
export class Admin {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name!: string;

	@Column()
	email!: string;

	@Column()
	password!: string;

	@Column({ type: 'bool', default: true })
	active: boolean;

	@OneToOne(() => Employee)
	@JoinColumn()
	employee: Employee;

	@Column({ nullable: true })
	employeeId?: number;
}
