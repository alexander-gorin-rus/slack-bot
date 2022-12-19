import { MigrationInterface, QueryRunner } from 'typeorm';

export class trigger1633691236585 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE OR REPLACE FUNCTION update_vacation_days(user_id int) RETURNS void AS $$
        update employees
        set days = (select coalesce(sum(days), 0) from vacation_day_changes where vacation_day_changes."employeeId" = employees.id )
        where employees.id = $1;
    $$ LANGUAGE sql`);
		await queryRunner.query(`CREATE OR REPLACE FUNCTION trigger_vacation_days() RETURNS trigger as $$
    BEGIN
        IF NEW."employeeId" IS NOT NULL THEN
            PERFORM update_vacation_days(NEW."employeeId");
        END IF;
        IF OLD."employeeId" IS NOT NULL THEN
            PERFORM update_vacation_days(OLD."employeeId");
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`);
		await queryRunner.query(`CREATE TRIGGER update_vacation_days
    AFTER INSERT OR UPDATE OR DELETE
    ON vacation_day_changes
    FOR EACH ROW EXECUTE PROCEDURE trigger_vacation_days()`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP TRIGGER update_vacation_days ON vacation_day_changes');
		await queryRunner.query('DROP FUNCTION trigger_vacation_days;');
		await queryRunner.query('DROP FUNCTION update_vacation_days;');
	}
}
