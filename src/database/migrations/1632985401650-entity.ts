import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1632985401650 implements MigrationInterface {
	name = 'entity1632985401650';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "IDX_9ef47d9517ddfe9fa0a89bda5f"`);
		await queryRunner.query(`DROP INDEX "IDX_c8c85bfd713c2c5be1c1d1172c"`);
		await queryRunner.query(`DROP INDEX "IDX_369c241605122cebb937b747d4"`);
		await queryRunner.query(`ALTER TABLE "vacation_request_confirms" DROP COLUMN "role"`);
		await queryRunner.query(`ALTER TABLE "vacation_requests" DROP COLUMN "role"`);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "role"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "employees" ADD "role" character varying NOT NULL`);
		await queryRunner.query(
			`ALTER TABLE "vacation_requests" ADD "role" character varying NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" ADD "role" character varying NOT NULL`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_369c241605122cebb937b747d4" ON "employees" ("role") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_c8c85bfd713c2c5be1c1d1172c" ON "vacation_requests" ("role") `
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_9ef47d9517ddfe9fa0a89bda5f" ON "vacation_request_confirms" ("role") `
		);
	}
}
