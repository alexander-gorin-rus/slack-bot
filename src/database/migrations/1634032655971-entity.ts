import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1634032655971 implements MigrationInterface {
	name = 'entity1634032655971';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "firstDay"`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "firstDay" date`);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "createdAt"`);
		await queryRunner.query(
			`ALTER TABLE "employees" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "createdAt"`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "createdAt" date NOT NULL DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "firstDay"`);
		await queryRunner.query(`ALTER TABLE "employees" ADD "firstDay" TIMESTAMP`);
	}
}
