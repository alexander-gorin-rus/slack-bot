import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633705594123 implements MigrationInterface {
	name = 'entity1633705594123';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "lastName"`);
		await queryRunner.query(`ALTER TABLE "admins" RENAME COLUMN "firstName" TO "name"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "admins" ADD "lastName" character varying NOT NULL`);
		await queryRunner.query(`ALTER TABLE "admins" RENAME COLUMN "name" TO "firstName"`);
	}
}
