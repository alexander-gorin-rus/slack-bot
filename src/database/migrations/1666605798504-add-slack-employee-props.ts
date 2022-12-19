import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlackEmployeeProps1666605798504 implements MigrationInterface {
	name = 'AddSlackEmployeeProps1666605798504';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "employees" ADD "slack_status_expiration" integer DEFAULT '0'`
		);
		await queryRunner.query(
			`COMMENT ON COLUMN "employees"."slack_status_expiration" IS 'Status expiration, 0 means infinite'`
		);
		await queryRunner.query(
			`ALTER TABLE "employees" ADD "slack_status_text" character varying DEFAULT ''`
		);
		await queryRunner.query(
			`COMMENT ON COLUMN "employees"."slack_status_text" IS 'Slack status text'`
		);
		await queryRunner.query(
			`ALTER TABLE "employees" ADD "slack_status_emoji" character varying DEFAULT ''`
		);
		await queryRunner.query(
			`COMMENT ON COLUMN "employees"."slack_status_emoji" IS 'Slack status emoji'`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`COMMENT ON COLUMN "employees"."slack_status_emoji" IS 'Slack status emoji'`
		);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "slack_status_emoji"`);
		await queryRunner.query(
			`COMMENT ON COLUMN "employees"."slack_status_text" IS 'Slack status text'`
		);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "slack_status_text"`);
		await queryRunner.query(
			`COMMENT ON COLUMN "employees"."slack_status_expiration" IS 'Status expiration, 0 means infinite'`
		);
		await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "slack_status_expiration"`);
	}
}
