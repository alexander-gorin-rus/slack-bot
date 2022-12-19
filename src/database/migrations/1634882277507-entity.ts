import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1634882277507 implements MigrationInterface {
	name = 'entity1634882277507';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "isPm" boolean NOT NULL DEFAULT false`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "isPm"`);
	}
}
