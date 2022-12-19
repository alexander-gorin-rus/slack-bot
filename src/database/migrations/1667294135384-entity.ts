import { MigrationInterface, QueryRunner } from "typeorm";

export class entity1667294135384 implements MigrationInterface {
    name = 'entity1667294135384'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admins" ADD "employeeId" integer`);
        await queryRunner.query(`ALTER TABLE "admins" ADD CONSTRAINT "UQ_4590373fab282bd4e6313993c90" UNIQUE ("employeeId")`);
        await queryRunner.query(`ALTER TABLE "admins" ADD CONSTRAINT "FK_4590373fab282bd4e6313993c90" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admins" DROP CONSTRAINT "FK_4590373fab282bd4e6313993c90"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP CONSTRAINT "UQ_4590373fab282bd4e6313993c90"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "employeeId"`);
    }

}
