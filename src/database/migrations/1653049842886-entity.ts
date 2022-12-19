import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1653049842886 implements MigrationInterface {
	name = 'entity1653049842886';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "dayoff_requests" ADD "addReason" character varying');
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "dayoff_requests" DROP COLUMN "addReason"');
	}
}
