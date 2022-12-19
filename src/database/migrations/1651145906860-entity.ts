import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1651145906860 implements MigrationInterface {
	name = 'entity1651145906860';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "feedback_respondent" ADD "threadTs" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "feedback_respondent" DROP COLUMN "threadTs"`);
	}
}
