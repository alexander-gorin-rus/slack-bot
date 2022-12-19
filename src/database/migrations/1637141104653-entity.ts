import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1637141104653 implements MigrationInterface {
	name = 'entity1637141104653';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "headName"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "headName" character varying`);
	}
}
