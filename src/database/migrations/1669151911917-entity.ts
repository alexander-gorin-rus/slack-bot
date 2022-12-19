import { MigrationInterface, QueryRunner } from "typeorm";

export class entity1669151911917 implements MigrationInterface {
    name = 'entity1669151911917'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "addReason"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dayoff_requests" ADD "addReason" character varying`);
    }

}
