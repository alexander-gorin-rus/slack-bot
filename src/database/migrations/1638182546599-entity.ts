import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1638182546599 implements MigrationInterface {
	name = 'entity1638182546599';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "calendar" ("id" SERIAL NOT NULL, "yaer" TIMESTAMP NOT NULL, "months" character varying NOT NULL, "active" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2492fb846a48ea16d53864e3267" PRIMARY KEY ("id"))`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "calendar"`);
	}
}
