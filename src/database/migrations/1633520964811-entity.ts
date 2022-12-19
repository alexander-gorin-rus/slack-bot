import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633520964811 implements MigrationInterface {
	name = 'entity1633520964811';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_requests" ADD "to" TIMESTAMP NOT NULL DEFAULT now()`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "to"`);
	}
}
