import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1657475675399 implements MigrationInterface {
	name = 'entity1657475675399';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "dayoff_request_confirms" RENAME COLUMN "chanelId" TO "channelId"`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "dayoff_request_confirms" RENAME COLUMN "channelId" TO "chanelId"`
		);
	}
}
