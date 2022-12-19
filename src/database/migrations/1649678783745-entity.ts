import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1649678783745 implements MigrationInterface {
	name = 'entity1649678783745';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "isHR" boolean NOT NULL DEFAULT false`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "isHR"`);
	}
}
