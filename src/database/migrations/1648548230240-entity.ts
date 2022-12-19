import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1648548230240 implements MigrationInterface {
	name = 'entity1648548230240';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "employees" ADD "isLPR" boolean NOT NULL DEFAULT false');
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "employees" DROP COLUMN "isLPR"');
	}
}
