import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Employee } from '../entity/employee.entity';
import { MoreThan, Repository } from 'typeorm';
import { BaseService } from './base.service';
import { NO_PM_SELECTED } from '../../utils';

type SlackStatus = Pick<
	Employee,
	'slack_status_emoji' | 'slack_status_expiration' | 'slack_status_text'
>;

@Injectable()
export class EmployeeService extends BaseService<Employee> {
	constructor(@InjectRepository(Employee) protected repository: Repository<Employee>) {
		super();
	}

	async updateSlackStatus(employeeId: number, payload: Partial<SlackStatus>) {
		return await this.repository.update({ id: employeeId }, payload);
	}

	getBySlackId = async (slackId: string): Promise<Employee | undefined> => {
		const employee = await this.repository.findOne({ where: { slackId } });
		if (employee) {
			return employee;
		}
	};

	async getAllWithDays(): Promise<Employee[]> {
		const res = await this.repository.find({
			where: { days: MoreThan(28) },
			relations: ['daysMessages'],
		});
		if (res) {
			return res;
		}
	}

	async getAll(): Promise<Employee[]> {
		return await this.repository.find();
	}

	async getPmOptionList(): Promise<Record<string, string>> {
		const pmListRes = await this.repository.find({
			where: {
				isPm: true,
			},
			order: {
				realNameRu: 'ASC',
			},
			select: ['slackId', 'realNameRu'],
		});
		const res: Record<string, string> = {};
		res[NO_PM_SELECTED] = 'У меня нет ПМов';

		for (const data of pmListRes) {
			res[data.slackId] = data.realNameRu;
		}
		return res;
	}

	async getManyWithoutCalculatedVacationDays(date?: string | Date | null): Promise<Employee[]> {
		const dateObject = date ? new Date(date) : new Date();
		const year = dateObject.getFullYear();
		const month = dateObject.getMonth() + 1;
		const day = dateObject.getDate() == 28 ? 31 : dateObject.getDate(); // it`s work solution
		const qb = this.repository.createQueryBuilder('item');
		const yearGreat = `EXTRACT(year FROM item."firstDay") < ${year}`;
		const yearEqual = `EXTRACT(year FROM item."firstDay") = ${year}`;
		const monthGreat = `EXTRACT(month FROM item."firstDay") < ${month}`;
		qb.andWhere(`EXTRACT(day FROM item."firstDay") <= ${day}`);
		qb.andWhere(`(${yearGreat} OR (${yearEqual} AND ${monthGreat}))`);
		const count = `SELECT COALESCE(count(*), 0) FROM vacation_day_changes vdc WHERE vdc."employeeId" = item.id AND vdc."calculatedMonth" = '${month}.${year}'`;
		qb.andWhere(`0 = (${count})`);
		return await qb.getMany();
	}

	/**
	 * Recursively finds LPR of the employee
	 * @param employee
	 * @param checkedEmployeeIds
	 * @returns Employee
	 */
	async findLPR(employee: Employee, checkedEmployeeIds: number[] = []): Promise<Employee> {
		if (employee.id === employee.headId && !employee.isLPR) {
			const errorMessage = `Endless cycle: employee.id is equal to employee.headId. Employee: ${employee.realNameRu} (id: ${employee.id}, email: ${employee.email})`;
			throw new Error(errorMessage);
		}

		if (checkedEmployeeIds.includes(employee.id)) {
			const errorMessage = `Endless cycle: employee.id is exists in array of checked id's. Employee: ${employee.realNameRu} (id: ${employee.id}, email: ${employee.email})`;
			throw new Error(errorMessage);
		}

		if (employee.isLPR) {
			return employee;
		} else {
			const headId = employee.headId;
			const head = await this.findOne(headId);
			return this.findLPR(head, [...checkedEmployeeIds, employee.id]);
		}
	}
}
