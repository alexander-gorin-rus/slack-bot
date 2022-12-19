import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1639653597184 implements MigrationInterface {
	name = 'entity1639653597184';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`
		);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ADD "messageTs" character varying`);
		await queryRunner.query(
			`ALTER TABLE "dayoff_request_confirms" ADD "messageTs" character varying`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_request_confirms" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_request_confirms" DROP COLUMN "createdAt"`);
		await queryRunner.query(`ALTER TABLE "dayoff_request_confirms" DROP COLUMN "messageTs"`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "messageTs"`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "updatedAt"`);
	}
}
