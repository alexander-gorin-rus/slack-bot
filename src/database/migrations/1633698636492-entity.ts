import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633698636492 implements MigrationInterface {
	name = 'entity1633698636492';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "firstDay"`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "firstDay" TIMESTAMP`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "firstDay"`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "firstDay" character varying`);
	}
}
