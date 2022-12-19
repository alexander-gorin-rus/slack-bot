import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1638198375948 implements MigrationInterface {
	name = 'entity1638198375948';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" RENAME COLUMN "yaer" TO "year"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" RENAME COLUMN "year" TO "yaer"`);
	}
}
