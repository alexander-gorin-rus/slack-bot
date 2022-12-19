import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1640088049104 implements MigrationInterface {
	name = 'entity1640088049104';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'ALTER TABLE "employees" ADD "hasNoVacataionDays" boolean NOT NULL DEFAULT false'
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "employees" DROP COLUMN "hasNoVacataionDays"');
	}
}
