import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_VACATION_DAYS_COEFFICIENT } from '../entity/employee.entity';

export class entity1662128432045 implements MigrationInterface {
	name = 'entity1662128432045';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" ADD CONSTRAINT "UQ_79fcf979eb9cf5c9a0bb01272a3" UNIQUE ("slackId")`
		);
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT ${DEFAULT_VACATION_DAYS_COEFFICIENT}`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT ${DEFAULT_VACATION_DAYS_COEFFICIENT}`
		);
		await queryRunner.query(
			`ALTER TABLE "employees" DROP CONSTRAINT "UQ_79fcf979eb9cf5c9a0bb01272a3"`
		);
	}
}
