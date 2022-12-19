import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1641744889525 implements MigrationInterface {
	name = 'entity1641744889525';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "days_messages" DROP COLUMN "messageTs"`);
		await queryRunner.query(
			`ALTER TABLE "days_messages" ADD "messageTs" character varying NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "days_messages" DROP COLUMN "messageTs"`);
		await queryRunner.query(`ALTER TABLE "days_messages" ADD "messageTs" date NOT NULL`);
	}
}
