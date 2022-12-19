import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1641384154375 implements MigrationInterface {
	name = 'entity1641384154375';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_requests" ADD "approve" boolean`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "approve"`);
	}
}
