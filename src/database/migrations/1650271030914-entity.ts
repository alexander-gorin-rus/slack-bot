import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1650271030914 implements MigrationInterface {
	name = 'entity1650271030914';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" DROP CONSTRAINT "FK_32f0fcfbf6a483227343b06b768"`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" DROP CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae"`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ALTER COLUMN "feedbackRespondentId" SET NOT NULL`
		);
		await queryRunner.query(`ALTER TABLE "feedback_answer" ALTER COLUMN "questionId" SET NOT NULL`);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ADD CONSTRAINT "FK_32f0fcfbf6a483227343b06b768" FOREIGN KEY ("feedbackRespondentId") REFERENCES "feedback_respondent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ADD CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae" FOREIGN KEY ("questionId") REFERENCES "feedback_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" DROP CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae"`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" DROP CONSTRAINT "FK_32f0fcfbf6a483227343b06b768"`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ALTER COLUMN "questionId" DROP NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ALTER COLUMN "feedbackRespondentId" DROP NOT NULL`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ADD CONSTRAINT "FK_5bdd24a43ea8b2ec23235ad02ae" FOREIGN KEY ("questionId") REFERENCES "feedback_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "feedback_answer" ADD CONSTRAINT "FK_32f0fcfbf6a483227343b06b768" FOREIGN KEY ("feedbackRespondentId") REFERENCES "feedback_respondent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		);
	}
}
