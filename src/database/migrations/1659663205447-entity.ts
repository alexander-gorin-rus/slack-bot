import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1659663205447 implements MigrationInterface {
	name = 'entity1659663205447';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "sell_requests" ADD "globalId" uuid DEFAULT uuid_generate_v4()`
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_day_changes" ADD "globalId" uuid DEFAULT uuid_generate_v4()`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_day_changes" DROP COLUMN "globalId"`);
		await queryRunner.query(`ALTER TABLE "sell_requests" DROP COLUMN "globalId"`);
	}
}
