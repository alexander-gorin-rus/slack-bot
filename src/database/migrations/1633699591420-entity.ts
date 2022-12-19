import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1633699591420 implements MigrationInterface {
	name = 'entity1633699591420';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "admins" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "admin-logs" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "resource" character varying NOT NULL, "record" character varying, "action" character varying, "adminId" integer, CONSTRAINT "PK_4acae3939385fce61f89f3a6ee1" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`ALTER TABLE "admin-logs" ADD CONSTRAINT "FK_06422d5c68ceffd53bb8f3fb07c" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`INSERT INTO "admins" ("firstName", "lastName", email, password, active) VALUES ('Admin', '', 'admin@example.com', '$argon2i$v=19$m=4096,t=3,p=1$jxX3TZd+voEVbTjlvYg2TA$nhZD0lVfGT44t/cIpnMq+NnitVhebWWdH6CPhOfJ0Pk', true);`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "admin-logs" DROP CONSTRAINT "FK_06422d5c68ceffd53bb8f3fb07c"`
		);
		await queryRunner.query(`DROP TABLE "admin-logs"`);
		await queryRunner.query(`DROP TABLE "admins"`);
	}
}
