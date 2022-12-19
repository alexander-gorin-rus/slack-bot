import { MigrationInterface, QueryRunner } from "typeorm";

export class entity1669314548515 implements MigrationInterface {
    name = 'entity1669314548515'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`UPDATE vacation_requests SET "globalId" = uuid_generate_v4() WHERE "globalId" IS NULL;`);
        await queryRunner.query(`UPDATE dayoff_requests SET "globalId" = uuid_generate_v4() WHERE "globalId" IS NULL;`);
        await queryRunner.query(`UPDATE sell_requests SET "globalId" = uuid_generate_v4() WHERE "globalId" IS NULL;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}