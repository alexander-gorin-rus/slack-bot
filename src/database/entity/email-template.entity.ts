import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('email_template')
export class EmailTemplate {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name!: string;

	@Column()
	subject!: string;

	@Column()
	code!: string;

	@Column({ type: 'text' })
	template!: string;

	@Column('text', { array: true, nullable: true })
	emails: string[];
}
