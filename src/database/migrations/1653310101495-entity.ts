import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1653310101495 implements MigrationInterface {
	name = 'entity1653310101495';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "dayoff_requests" ADD "cancelReason" character varying');
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "dayoff_requests" DROP COLUMN "cancelReason"');
	}
}
