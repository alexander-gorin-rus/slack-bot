import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1634045807960 implements MigrationInterface {
	name = 'entity1634045807960';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" ADD "pmApprove" boolean NOT NULL DEFAULT true`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "pmApprove"`);
	}
}
