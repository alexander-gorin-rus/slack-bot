import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1649944614326 implements MigrationInterface {
	name = 'entity1649944614326';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "feedback_question" ("id" SERIAL NOT NULL, "text" text NOT NULL, "order" integer NOT NULL, "active" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_6ea879215314c5d45dab2c3599c" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "feedback_answer" ("id" SERIAL NOT NULL, "respondentId" integer NOT NULL, "questionId" integer NOT NULL, "text" text NOT NULL, "feedbackRespondentId" integer, CONSTRAINT "PK_845609147a39b5aa34b9bce206e" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "feedback_respondent" ("id" SERIAL NOT NULL, "feedbackRequestId" integer NOT NULL, "employeeId" integer NOT NULL, "status" character varying NOT NULL, "channelId" character varying, "messageTs" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_db06b621466cb52c60146276f49" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`CREATE TABLE "feedback_requests" ("id" SERIAL NOT NULL, "employeeId" integer NOT NULL, "date" date NOT NULL, "status" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4fceb8b13258b93add53a14d967" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ADD CONSTRAINT "FK_32f0fcfbf6a483227343b06b768" FOREIGN KEY ("feedbackRespondentId") REFERENCES "feedback_respondent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ADD CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae" FOREIGN KEY ("questionId") REFERENCES "feedback_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_respondent" ADD CONSTRAINT "FK_420455400e893f368be8cda6b1e" FOREIGN KEY ("feedbackRequestId") REFERENCES "feedback_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_respondent" ADD CONSTRAINT "FK_a569efbae1ada76a50b45ee174f" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_requests" ADD CONSTRAINT "FK_da747793a65a35aef49a3b3348c" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "feedback_requests" DROP CONSTRAINT "FK_da747793a65a35aef49a3b3348c"`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_respondent" DROP CONSTRAINT "FK_a569efbae1ada76a50b45ee174f"`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_respondent" DROP CONSTRAINT "FK_420455400e893f368be8cda6b1e"`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" DROP CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae"`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" DROP CONSTRAINT "FK_32f0fcfbf6a483227343b06b768"`
		);
		await queryRunner.query(`DROP TABLE "feedback_requests"`);
		await queryRunner.query(`DROP TABLE "feedback_respondent"`);
		await queryRunner.query(`DROP TABLE "feedback_answer"`);
		await queryRunner.query(`DROP TABLE "feedback_question"`);
	}
}
