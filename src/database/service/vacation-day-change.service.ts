import { Injectable } from '@nestjs/common';
import { BaseService } from './base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VacationDayChange } from '../entity/vacation-day-change.entity';
import { Employee } from '../entity/employee.entity';

@Injectable()
export class VacationDayChangeService extends BaseService<VacationDayChange> {
	constructor(
		@InjectRepository(VacationDayChange)
		protected repository: Repository<VacationDayChange>
	) {
		super();
	}

	async add(employee: Employee, days: number, reason: string) {
		const change = new VacationDayChange();
		change.employee = employee;
		change.days = days;
		employee.days = Number(employee.days) + days;
		change.reason = reason;
		await this.repository.manager.transaction(async (em) => {
			await em.save(change);
			await em.save(employee);
		});
		await this.repository.save(change);
		return change;
	}
}
