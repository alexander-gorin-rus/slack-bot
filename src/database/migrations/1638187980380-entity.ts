import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1638187980380 implements MigrationInterface {
	name = 'entity1638187980380';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" DROP COLUMN "yaer"`);
		await queryRunner.query(`ALTER TABLE "calendar" ADD "yaer" character varying NOT NULL`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" DROP COLUMN "yaer"`);
		await queryRunner.query(`ALTER TABLE "calendar" ADD "yaer" TIMESTAMP NOT NULL`);
	}
}
