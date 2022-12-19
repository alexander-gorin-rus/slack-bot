import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1634562546741 implements MigrationInterface {
	name = 'entity1634562546741';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_day_changes" ADD "calculated_month" character varying`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_day_changes" DROP COLUMN "calculated_month"`);
	}
}
