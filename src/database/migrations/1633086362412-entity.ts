import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633086362412 implements MigrationInterface {
	name = 'entity1633086362412';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "dayoff_requests" ("id" SERIAL NOT NULL, "status" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "from" TIMESTAMP NOT NULL, "days" integer NOT NULL, "employeeId" integer, CONSTRAINT "PK_35b8973ce8c9b5cbe7be4a41f41" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "dayoff_request_confirms" ("id" SERIAL NOT NULL, "status" character varying NOT NULL, "dayoffRequestId" integer, "managerId" integer, CONSTRAINT "PK_4e6bd665c59c2b88461fe17ee17" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ADD CONSTRAINT "FK_78902e12eaa36595ddb496be494" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_request_confirms" ADD CONSTRAINT "FK_f81426d643ebc009010556f40e0" FOREIGN KEY ("dayoffRequestId") REFERENCES "dayoff_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_request_confirms" ADD CONSTRAINT "FK_cf35e73378ff3c1afc2c158499d" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "dayoff_request_confirms" DROP CONSTRAINT "FK_cf35e73378ff3c1afc2c158499d"`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_request_confirms" DROP CONSTRAINT "FK_f81426d643ebc009010556f40e0"`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" DROP CONSTRAINT "FK_78902e12eaa36595ddb496be494"`
		);
		await queryRunner.query(`DROP TABLE "dayoff_request_confirms"`);
		await queryRunner.query(`DROP TABLE "dayoff_requests"`);
	}
}
