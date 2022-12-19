import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1657452875067 implements MigrationInterface {
	name = 'entity1657452875067';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "isLPR" boolean NOT NULL DEFAULT false`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN IF EXISTS "isLPR"`);
	}
}
