import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633697353176 implements MigrationInterface {
	name = 'entity1633697353176';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "firstDay" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "firstDay"`);
	}
}
