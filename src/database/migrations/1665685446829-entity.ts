import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1665685446829 implements MigrationInterface {
	name = 'entity1665685446829';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "SPStatus" integer NOT NULL DEFAULT '0'`);
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT '2.33'`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT 2.33`
		);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "SPStatus"`);
	}
}
