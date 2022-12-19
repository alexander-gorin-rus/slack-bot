import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1636721794640 implements MigrationInterface {
	name = 'entity1636721794640';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "headName" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "headName"`);
	}
}
