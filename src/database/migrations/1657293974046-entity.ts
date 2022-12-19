import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1657293974046 implements MigrationInterface {
	name = 'entity1657293974046';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_requests" ADD COLUMN IF NOT EXISTS "isRejectVacation" boolean NOT NULL DEFAULT false`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_requests"" DROP COLUMN IF EXISTS "isRejectVacation"`
		);
	}
}
