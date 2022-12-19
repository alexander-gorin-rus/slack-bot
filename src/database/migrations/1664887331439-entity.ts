import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1664887331439 implements MigrationInterface {
	name = 'entity1664887331439';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ADD "channelId" character varying`);
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT '2.33'`
		);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ALTER COLUMN "workingOff" SET NOT NULL`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ALTER COLUMN "workingOff" DROP DEFAULT`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ALTER COLUMN "workingOff" SET DEFAULT false`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ALTER COLUMN "workingOff" DROP NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT 2.33`
		);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "channelId"`);
	}
}
