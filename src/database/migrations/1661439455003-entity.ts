import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_VACATION_DAYS_COEFFICIENT } from '../entity/employee.entity';

export class entity1661439455003 implements MigrationInterface {
	name = 'entity1661439455003';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "vacation_requests" ADD "isNotified" boolean');
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT '${DEFAULT_VACATION_DAYS_COEFFICIENT}'`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT ${DEFAULT_VACATION_DAYS_COEFFICIENT}`
		);
		await queryRunner.query('ALTER TABLE "vacation_requests" DROP COLUMN "isNotified"');
	}
}
