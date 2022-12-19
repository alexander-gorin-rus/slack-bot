import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633334690794 implements MigrationInterface {
	name = 'entity1633334690794';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ADD "workingOff" character varying NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "dayoff_requests" ADD "reason" character varying NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "reason"`);
		await queryRunner.query(`ALTER TABLE "dayoff_requests" DROP COLUMN "workingOff"`);
	}
}
