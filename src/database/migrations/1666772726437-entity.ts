import { MigrationInterface, QueryRunner } from "typeorm";

export class entity1666772726437 implements MigrationInterface {
    name = 'entity1666772726437'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_6d94bb717bc912c4c1d986ab99a"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "employeeId"`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "positionId" integer`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT '2.33'`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_ce0210d6441acd0e094fba8f20a" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_ce0210d6441acd0e094fba8f20a"`);
        await queryRunner.query(`ALTER TABLE "employees" ALTER COLUMN "vacationDaysPerMonth" SET DEFAULT 2.33`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "positionId"`);
        await queryRunner.query(`ALTER TABLE "positions" ADD "employeeId" integer`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_6d94bb717bc912c4c1d986ab99a" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
