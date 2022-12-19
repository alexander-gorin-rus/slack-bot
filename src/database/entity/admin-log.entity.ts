import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AdminLogsSourceEnum } from '../util/admin-logs-source.enum';
import { Admin } from './admin.entity';

@Entity('admin-logs')
export class AdminLog {
	@PrimaryGeneratedColumn()
	id: number;

	@CreateDateColumn()
	createdAt!: Date;

	@ManyToOne(() => Admin)
	admin: Admin;

	@Column('integer', { nullable: true })
	adminId: number;

	@Column('varchar', { nullable: false })
	resource: string;

	@Column('varchar', { nullable: true })
	record: string;

	@Column('varchar', { nullable: true })
	action: string;

	@Column('varchar', { nullable: true })
	description: string;

	@Column('varchar', { nullable: true, default: AdminLogsSourceEnum.ADMIN })
	source: AdminLogsSourceEnum;
}
