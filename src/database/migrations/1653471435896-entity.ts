import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1653471435896 implements MigrationInterface {
	name = 'entity1653471435896';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "vacation_requests" ADD "reason" text');
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "vacation_requests" DROP COLUMN "reason"');
	}
}
