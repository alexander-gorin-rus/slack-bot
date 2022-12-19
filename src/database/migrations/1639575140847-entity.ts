import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1639575140847 implements MigrationInterface {
	name = 'entity1639575140847';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_request_confirms" ADD "messageTs" character varying`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "vacation_request_confirms" DROP COLUMN "messageTs"`);
	}
}
