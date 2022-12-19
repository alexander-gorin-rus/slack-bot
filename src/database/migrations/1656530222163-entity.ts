import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_VACATION_DAYS_COEFFICIENT } from '../entity/employee.entity';

export class entity1656530222163 implements MigrationInterface {
	name = 'entity1656530222163';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "vacationDaysPerMonth" numeric NOT NULL DEFAULT ${DEFAULT_VACATION_DAYS_COEFFICIENT}`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "vacationDaysPerMonth"`);
	}
}
