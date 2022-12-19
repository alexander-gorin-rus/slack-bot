import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1643363337870 implements MigrationInterface {
	name = 'entity1643363337870';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "email_template" ADD "emails" text array`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "email_template" DROP COLUMN "emails"`);
	}
}
