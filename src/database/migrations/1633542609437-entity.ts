import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633542609437 implements MigrationInterface {
	name = 'entity1633542609437';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "firstName"`);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "lastName"`);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "realNameEn"`);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "city"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "city" character varying NOT NULL`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "realNameEn" character varying NOT NULL`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "lastName" character varying NOT NULL`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "firstName" character varying NOT NULL`);
	}
}
