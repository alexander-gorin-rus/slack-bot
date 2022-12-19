import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1651144039746 implements MigrationInterface {
	name = 'entity1651144039746';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "feedback_requests" ADD "messageTsHR" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "feedback_requests" DROP COLUMN "messageTsHR"`);
	}
}
