import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1658811482829 implements MigrationInterface {
	name = 'entity1658811482829';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_requests" ADD "globalId" uuid`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "globalId" uuid`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ADD "globalId" uuid`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "globalId"`);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "globalId"`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "globalId"`);
	}
}
