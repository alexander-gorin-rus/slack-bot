import { MigrationInterface, QueryRunner } from "typeorm";

export class entity1667814011212 implements MigrationInterface {
    name = 'entity1667814011212'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin-logs" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "admin-logs" ADD "source" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin-logs" DROP COLUMN "source"`);
        await queryRunner.query(`ALTER TABLE "admin-logs" DROP COLUMN "description"`);
    }

}
