import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1638348711761 implements MigrationInterface {
	name = 'entity1638348711761';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" DROP COLUMN "months"`);
		await queryRunner.query(`ALTER TABLE "calendar" ADD "months" text NOT NULL`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" DROP COLUMN "months"`);
		await queryRunner.query(`ALTER TABLE "calendar" ADD "months" character varying NOT NULL`);
	}
}
