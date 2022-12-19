import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1652359468726 implements MigrationInterface {
	name = 'entity1652359468726';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'ALTER TABLE "feedback_question" ADD "required" boolean NOT NULL DEFAULT true'
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "feedback_question" DROP COLUMN "required"');
	}
}
