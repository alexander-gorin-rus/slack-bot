import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1638882531374 implements MigrationInterface {
	name = 'entity1638882531374';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" ALTER COLUMN "nonWorkingDays" DROP NOT NULL`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "calendar" ALTER COLUMN "nonWorkingDays" SET NOT NULL`);
	}
}
