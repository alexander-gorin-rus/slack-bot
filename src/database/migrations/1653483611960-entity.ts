import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1653483611960 implements MigrationInterface {
	name = 'entity1653483611960';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "vacation_requests" ADD "cancelReason" text');
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "vacation_requests" DROP COLUMN "cancelReason"');
	}
}
