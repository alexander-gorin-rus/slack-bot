import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1653552893721 implements MigrationInterface {
	name = 'entity1653552893721';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "sell_requests" ADD "reason" text');
		await queryRunner.query('ALTER TABLE "sell_requests" ADD "cancelReason" text');
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "sell_requests" DROP COLUMN "cancelReason"');
		await queryRunner.query('ALTER TABLE "sell_requests" DROP COLUMN "reason"');
	}
}
