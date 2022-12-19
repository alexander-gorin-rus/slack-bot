import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1632719617910 implements MigrationInterface {
	name = 'entity1632719617910';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "vacation_request_confirms" ("id" SERIAL NOT NULL, "role" character varying NOT NULL, "status" character varying NOT NULL, "vacationRequestId" integer, "managerId" integer, CONSTRAINT "PK_9b10cf2e6304586761f256babe1" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_9ef47d9517ddfe9fa0a89bda5f" ON "vacation_request_confirms" ("role") `
		);
		await queryRunner.query(
			`CREATE TABLE "vacation_requests" ("id" SERIAL NOT NULL, "status" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "from" TIMESTAMP NOT NULL, "days" integer NOT NULL, "role" character varying NOT NULL, "employeeId" integer, CONSTRAINT "PK_e8ca8afb59b9a4350c339b66843" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_c8c85bfd713c2c5be1c1d1172c" ON "vacation_requests" ("role") `
		);
		await queryRunner.query(
			`CREATE TABLE "employees" ("id" SERIAL NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "email" character varying NOT NULL, "real_name_ru" character varying NOT NULL, "real_name_en" character varying NOT NULL, "city" character varying NOT NULL, "days" numeric(10,6) NOT NULL DEFAULT '0', "slackId" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "role" character varying NOT NULL, "headId" integer, CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_369c241605122cebb937b747d4" ON "employees" ("role") `
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" ADD CONSTRAINT "FK_cf2c3c8e12bd025600e9e8e4aec" FOREIGN KEY ("vacationRequestId") REFERENCES "vacation_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" ADD CONSTRAINT "FK_310b3263ffaa401b9d64cc43435" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_requests" ADD CONSTRAINT "FK_bed8e288ef59ce00ca90364a3bf" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "employees" ADD CONSTRAINT "FK_e90960125ff8f110200e480308e" FOREIGN KEY ("headId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" DROP CONSTRAINT "FK_e90960125ff8f110200e480308e"`
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_requests" DROP CONSTRAINT "FK_bed8e288ef59ce00ca90364a3bf"`
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" DROP CONSTRAINT "FK_310b3263ffaa401b9d64cc43435"`
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" DROP CONSTRAINT "FK_cf2c3c8e12bd025600e9e8e4aec"`
		);
		await queryRunner.query(`DROP INDEX "IDX_369c241605122cebb937b747d4"`);
		await queryRunner.query(`DROP TABLE "employees"`);
		await queryRunner.query(`DROP INDEX "IDX_c8c85bfd713c2c5be1c1d1172c"`);
		await queryRunner.query(`DROP TABLE "vacation_requests"`);
		await queryRunner.query(`DROP INDEX "IDX_9ef47d9517ddfe9fa0a89bda5f"`);
		await queryRunner.query(`DROP TABLE "vacation_request_confirms"`);
	}
}
