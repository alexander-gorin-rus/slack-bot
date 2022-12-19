import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633586963443 implements MigrationInterface {
	name = 'entity1633586963443';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DELETE FROM "vacation_request_confirms" WHERE TRUE`);
		await queryRunner.query(`DELETE FROM "vacation_requests" WHERE TRUE`);
		await queryRunner.query(`DELETE FROM "dayoff_request_confirms" WHERE TRUE`);
		await queryRunner.query(`DELETE FROM "dayoff_requests" WHERE TRUE`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "from"`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ADD "from" date NOT NULL`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "to"`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ADD "to" date NOT NULL`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "from"`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ADD "from" date NOT NULL`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "to"`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ADD "to" date NOT NULL`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "to"`);
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ADD "to" TIMESTAMP NOT NULL DEFAULT now()`
		);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "from"`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" ADD "from" TIMESTAMP NOT NULL`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "to"`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ADD "to" TIMESTAMP NOT NULL`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "from"`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" ADD "from" TIMESTAMP NOT NULL`);
	}
}
