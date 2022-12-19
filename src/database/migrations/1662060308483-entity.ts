import { MigrationInterface, QueryRunner } from 'typeorm';

export class entity1662060308483 implements MigrationInterface {
	name = 'entity1662060308483';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE dayoff_requests ADD temp_column BOOLEAN DEFAULT(false);');
		await queryRunner.query(
			'UPDATE dayoff_requests SET temp_column = CASE WHEN dayoff_requests."workingOff" = \'да\' THEN true ELSE false END;'
		);
		await queryRunner.query('ALTER TABLE dayoff_requests DROP COLUMN "workingOff";');
		await queryRunner.query(
			'ALTER TABLE dayoff_requests RENAME COLUMN temp_column TO "workingOff";'
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE dayoff_requests ADD temp_column VARCHAR(20);');
		await queryRunner.query(
			"UPDATE dayoff_requests SET temp_column = CASE WHEN dayoff_requests.\"workingOff\" = true THEN 'да' ELSE 'нет' END;"
		);
		await queryRunner.query('ALTER TABLE dayoff_requests DROP COLUMN "workingOff";');
		await queryRunner.query(
			'ALTER TABLE dayoff_requests RENAME COLUMN temp_column TO "workingOff";'
		);
	}
}
