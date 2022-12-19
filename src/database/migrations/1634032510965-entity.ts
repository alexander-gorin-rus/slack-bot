import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1634032510965 implements MigrationInterface {
	name = 'entity1634032510965';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "createdAt"`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "createdAt" date NOT NULL DEFAULT now()`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "createdAt"`);
		await queryRunner.query(
			`ALTER TABLE "employees" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`
		);
	}
}
