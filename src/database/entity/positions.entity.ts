import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Employee } from './employee.entity';

@Entity('positions')
export class Position {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'uuid', nullable: false })
	globalId: string;

	@Column({ type: 'varchar', nullable: false })
	name: string;

	@OneToMany(() => Employee, (employee) => employee.position)
	employee: Employee;
}
