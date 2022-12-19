import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1638351353623 implements MigrationInterface {
	name = 'entity1638351353623';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "sell_requests" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "from" date NOT NULL, "days" integer NOT NULL, "to" date NOT NULL, "employeeId" integer, CONSTRAINT "PK_4f5330ebf3aeea9c79f48d9b3bf" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`ALTER TABLE "sell_requests" ADD CONSTRAINT "FK_8ae2cf7567e7886f8fff7182ea2" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "sell_requests" DROP CONSTRAINT "FK_8ae2cf7567e7886f8fff7182ea2"`
		);
		await queryRunner.query(`DROP TABLE "sell_requests"`);
	}
}
