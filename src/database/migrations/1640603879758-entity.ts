import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1640603879758 implements MigrationInterface {
	name = 'entity1640603879758';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "sell_requests" ADD "status" character varying NOT NULL');
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "sell_requests" DROP COLUMN "status"');
	}
}
