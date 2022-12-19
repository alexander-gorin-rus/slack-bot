import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1659115115617 implements MigrationInterface {
	name = 'entity1659115115617';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ALTER COLUMN "to" TYPE timestamp`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ALTER COLUMN "from" TYPE timestamp`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ALTER COLUMN "to" TYPE timestamp`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ALTER COLUMN "from" TYPE timestamp`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ALTER COLUMN "to" TYPE date`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ALTER COLUMN "from" TYPE date`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ALTER COLUMN "to" TYPE date`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ALTER COLUMN "from" TYPE date`);
	}
}
