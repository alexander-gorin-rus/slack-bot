import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1649167095225 implements MigrationInterface {
	name = 'entity1649167095225';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'ALTER TABLE "vacation_request_confirms" ADD "chanelId" character varying'
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "vacation_request_confirms" DROP COLUMN "chanelId"');
	}
}
