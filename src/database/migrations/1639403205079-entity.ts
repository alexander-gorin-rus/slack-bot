import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1639403205079 implements MigrationInterface {
	name = 'entity1639403205079';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_requests" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "updatedAt"`);
		await queryRunner.query(`ALTER TABLE "vacation_request_confirms" DROP COLUMN "createdAt"`);
	}
}
