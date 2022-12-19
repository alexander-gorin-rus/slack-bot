import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1632985800195 implements MigrationInterface {
	name = 'entity1632985800195';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_requests" RENAME COLUMN "created_at" TO "createdAt"`
		);
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "first_name" TO "firstName"`);
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "last_name" TO "lastName"`);
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "real_name_ru" TO "realNameRu"`);
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "real_name_en" TO "realNameEn"`);
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "created_at" TO "createdAt"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "createdAt" TO "created_at"`);
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "realNameEn" TO "real_name_en"`);
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "realNameRu" TO "real_name_ru"`);
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "lastName" TO "last_name"`);
		await queryRunner.query(`ALTER TABLE "employees" RENAME COLUMN "firstName" TO "first_name"`);
		await queryRunner.query(
			`ALTER TABLE "vacation_requests" RENAME COLUMN "createdAt" TO "created_at"`
		);
	}
}
