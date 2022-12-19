import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1638373694166 implements MigrationInterface {
	name = 'entity1638373694166';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" RENAME COLUMN "months" TO "nonWorkingDays"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" RENAME COLUMN "nonWorkingDays" TO "months"`);
	}
}
