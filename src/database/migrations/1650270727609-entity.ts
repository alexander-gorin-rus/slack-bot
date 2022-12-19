import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1650270727609 implements MigrationInterface {
	name = 'entity1650270727609';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "feedback_answer" DROP COLUMN "respondentId"`);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" DROP CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae"`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ALTER COLUMN "questionId" DROP NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ADD CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae" FOREIGN KEY ("questionId") REFERENCES "feedback_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" DROP CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae"`
		);
		await queryRunner.query(`ALTER TABLE "feedback_answer" ALTER COLUMN "questionId" SET NOT NULL`);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ADD CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae" FOREIGN KEY ("questionId") REFERENCES "feedback_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(`ALTER TABLE "feedback_answer" ADD "respondentId" integer NOT NULL`);
	}
}
