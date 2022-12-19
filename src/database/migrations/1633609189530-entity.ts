import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633609189530 implements MigrationInterface {
	name = 'entity1633609189530';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "city" character varying`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "position" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "position"`);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "city"`);
	}
}
