import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1634101972524 implements MigrationInterface {
	name = 'entity1634101972524';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "email_template" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "code" character varying NOT NULL, "template" text NOT NULL, CONSTRAINT "PK_c90815fd4ca9119f19462207710" PRIMARY KEY ("id"))`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "email_template"`);
	}
}
