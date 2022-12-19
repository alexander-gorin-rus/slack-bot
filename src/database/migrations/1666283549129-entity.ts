import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1666283549129 implements MigrationInterface {
	name = 'entity1666283549129';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN IF EXISTS "IEStatus"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "public"."employees_iestatus_enum"`);
		await queryRunner.query(`ALTER TABLE "positions" ADD "employeeId" integer`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "grade" integer`);
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT '2.333333'`
		);
		await queryRunner.query(
			`ALTER TABLE "positions" ADD CONSTRAINT "FK_6d94bb717bc912c4c1d986ab99a" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "positions" DROP CONSTRAINT "FK_6d94bb717bc912c4c1d986ab99a"`
		);
		await queryRunner.query(
			`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT 2.33`
		);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "grade"`);
		await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "employeeId"`);
		await queryRunner.query(
			`CREATE TYPE "public"."employees_iestatus_enum" AS ENUM('Не является ИП', 'Является ИП', 'Привилегированный ИП')`
		);
	}
}
