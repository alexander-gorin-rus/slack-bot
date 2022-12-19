import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1659662992268 implements MigrationInterface {
	name = 'entity1659662992268';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_requests" ALTER COLUMN "globalId" SET DEFAULT uuid_generate_v4()`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ALTER COLUMN "globalId" SET DEFAULT uuid_generate_v4()`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ALTER COLUMN "globalId" DROP DEFAULT`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ALTER COLUMN "globalId" DROP DEFAULT`);
	}
}
