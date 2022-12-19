import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('calendar')
export class ProductionCalendar extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	year: string;

	@Column({ type: 'text', nullable: true })
	nonWorkingDays: string;

	@Column({ default: false })
	active: boolean;
}
