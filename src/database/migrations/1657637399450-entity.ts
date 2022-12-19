import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1657637399450 implements MigrationInterface {
	name = 'entity1657637399450';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" ADD COLUMN IF NOT EXISTS "chanelId" character varying`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" DROP COLUMN IF NOT EXISTS "chanelId"`
		);
	}
}
