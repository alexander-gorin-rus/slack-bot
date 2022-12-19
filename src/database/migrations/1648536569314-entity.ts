import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1648536569314 implements MigrationInterface {
	name = 'entity1648536569314';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "active" boolean NOT NULL DEFAULT false`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN IF EXISTS "active"`);
	}
}
