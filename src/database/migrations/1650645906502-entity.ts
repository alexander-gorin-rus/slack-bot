import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1650645906502 implements MigrationInterface {
	name = 'entity1650645906502';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "feedback_question" ADD "placeholder" text NOT NULL DEFAULT ''`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "feedback_question" DROP COLUMN "placeholder"`);
	}
}
