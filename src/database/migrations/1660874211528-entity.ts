import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1660874211528 implements MigrationInterface {
	name = 'entity1660874211528';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_day_changes" ADD "typeOfInitiator" character varying`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_day_changes" DROP COLUMN "typeOfInitiator"`);
	}
}
