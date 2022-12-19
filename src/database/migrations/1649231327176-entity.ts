import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1649231327176 implements MigrationInterface {
	name = 'entity1649231327176';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_request_confirms" DROP COLUMN "chanelId"`);
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ADD "isRejectDayOff" boolean NOT NULL DEFAULT false`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_request_confirms" ADD "chanelId" character varying`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_request_confirms" DROP COLUMN "chanelId"`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "isRejectDayOff"`);
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" ADD "chanelId" character varying`
		);
	}
}
