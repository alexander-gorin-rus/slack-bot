import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1666079793972 implements MigrationInterface {
	name = 'entity1666079793972';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "positions" ("id" SERIAL NOT NULL, "globalId" uuid NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "position"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "position" character varying`);
		await queryRunner.query(`DROP TABLE "positions"`);
	}
}
