import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1641738647912 implements MigrationInterface {
	name = 'entity1641738647912';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "sell_requests" ADD "vacationId" integer`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "sell_requests" DROP COLUMN "vacationId"`);
	}
}
