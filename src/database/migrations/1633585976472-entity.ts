import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633585976472 implements MigrationInterface {
	name = 'entity1633585976472';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ADD "to" TIMESTAMP NOT NULL DEFAULT now()`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "to"`);
	}
}
