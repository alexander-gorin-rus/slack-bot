import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1641744291734 implements MigrationInterface {
	name = 'entity1641744291734';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "days_messages" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "messageTs" date NOT NULL, "employeeId" integer, CONSTRAINT "PK_62e8536ea676c39d435516ff259" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`ALTER TABLE "days_messages" ADD CONSTRAINT "FK_b7ddbf88574802d5701e36c54d9" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "days_messages" DROP CONSTRAINT "FK_b7ddbf88574802d5701e36c54d9"`
		);
		await queryRunner.query(`DROP TABLE "days_messages"`);
	}
}
