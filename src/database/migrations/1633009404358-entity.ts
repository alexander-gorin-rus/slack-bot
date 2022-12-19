import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633009404358 implements MigrationInterface {
	name = 'entity1633009404358';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "vacation_day_changes" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "days" numeric(10,6) NOT NULL DEFAULT '0', "reason" character varying NOT NULL, "employeeId" integer, CONSTRAINT "PK_404147f87ae1d3247847d788a85" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`ALTER TABLE "vacation_day_changes" ADD CONSTRAINT "FK_80a4ac745e1d806a8dc67271ee8" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "vacation_day_changes" DROP CONSTRAINT "FK_80a4ac745e1d806a8dc67271ee8"`
		);
		await queryRunner.query(`DROP TABLE "vacation_day_changes"`);
	}
}
