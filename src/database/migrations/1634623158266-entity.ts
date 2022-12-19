import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1634623158266 implements MigrationInterface {
	name = 'entity1634623158266';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_day_changes" RENAME COLUMN "calculated_month" TO "calculatedMonth"`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_day_changes" RENAME COLUMN "calculatedMonth" TO "calculated_month"`
		);
	}
}
