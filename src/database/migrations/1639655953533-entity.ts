import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1639655953533 implements MigrationInterface {
	name = 'entity1639655953533';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_request_confirms" ADD "counter" integer`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ADD "counter" integer`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ADD "counter" integer`);
		await queryRunner.query(`ALTER TABLE "dayoff_request_confirms" ADD "counter" integer`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_request_confirms" DROP COLUMN "counter"`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "counter"`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "counter"`);
		await queryRunner.query(`ALTER TABLE "vacation_request_confirms" DROP COLUMN "counter"`);
	}
}
