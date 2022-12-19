import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1634105124343 implements MigrationInterface {
	name = 'entity1634105124343';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "email_template" ADD "subject" character varying NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "email_template" DROP COLUMN "subject"`);
	}
}
