import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1639646578352 implements MigrationInterface {
	name = 'entity1639646578352';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_requests" ADD "messageTs" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "messageTs"`);
	}
}
