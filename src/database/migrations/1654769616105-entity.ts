import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1654769616105 implements MigrationInterface {
	name = 'entity1654769616105';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "vacation_requests" ADD "channelId" character varying');
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE "vacation_requests" DROP COLUMN "channelId"');
	}
}
