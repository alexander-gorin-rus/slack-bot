import { MigrationInterface, QueryRunner } from "typeorm";

export class entity1667814744256 implements MigrationInterface {
    name = 'entity1667814744256'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin-logs" ALTER COLUMN "source" SET DEFAULT 'Admin'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin-logs" ALTER COLUMN "source" DROP DEFAULT`);
    }

}
