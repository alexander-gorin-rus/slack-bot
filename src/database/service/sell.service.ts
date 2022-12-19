import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Employee } from '../entity/employee.entity';
import { SellRequest } from '../entity/sell.entity';
import { SellRequestStatus } from '../util/sell-request-status.enum';
import { settings } from '../../configs/settings';

@Injectable()
export class SellRequestService extends BaseService<SellRequest> {
	constructor(@InjectRepository(SellRequest) protected repository: Repository<SellRequest>) {
		super();
	}

	export() {
		return this.repository.find({
			relations: ['employee', 'employee.head'],
			order: { id: 'ASC' },
		});
	}

	async findCrossingRequest(employee: Employee, from: Date, to: Date): Promise<SellRequest[]> {
		const qb = this.repository.createQueryBuilder('item');
		// check crossing dates
		qb.where(
			'(item."from" BETWEEN :from AND :to OR item."to" BETWEEN :from AND :to OR :from BETWEEN item."from" AND item."to")',
			{ from, to }
		);
		qb.andWhere('item.employee = :employee', { employee: employee.id });
		qb.andWhere('item.status = :status', { status: SellRequestStatus.PLANNED });
		return await qb.getMany();
	}

	async count(employeeId: number): Promise<number> {
		return await this.repository.count({
			where: {
				employeeId,
				status: In([SellRequestStatus.PLANNED, SellRequestStatus.ADDED_BY_ADMIN]),
			},
		});
	}

	async findSellRequestsForYear(employee: Employee, isPersonal?: boolean): Promise<SellRequest[]> {
		const today = isPersonal ? new Date(employee.firstDay) : new Date();
		const currentYear = today.getFullYear();
		const startMonth = isPersonal ? today.getMonth() : settings.firstMonth;
		const endMonth = isPersonal ? today.getMonth() : settings.lastMonth;
		const startDay = isPersonal ? today.getDate() : settings.firstDay;
		const endDay = isPersonal ? today.getDate() : settings.lastDay;

		const firstDayCurrYear = new Date(currentYear, startMonth, startDay);
		const lastDayCurrYear = new Date(isPersonal ? currentYear + 1 : currentYear, endMonth, endDay);
		const sells = await this.repository.find({
			where: {
				employeeId: employee.id,
				from: Between(firstDayCurrYear, lastDayCurrYear),
			},
		});
		return sells;
	}

	async findPlannedRequest() {
		return await this.repository.find({
			where: {
				status: In([
					SellRequestStatus.PLANNED,
					SellRequestStatus.ADDED_WITH_VACATION,
					SellRequestStatus.ADDED_BY_ADMIN,
				]),
			},
			relations: ['employee'],
		});
	}

	async findPlannedAfterVacRequest(vacationId): Promise<SellRequest> {
		const sell = await this.repository.findOne({
			where: {
				vacationId,
				status: In([SellRequestStatus.ADDED_WITH_VACATION, SellRequestStatus.PLANNED]),
			},
			relations: ['employee'],
		});
		return sell;
	}

	async findAll(employeeId: number): Promise<SellRequest[]> {
		return await this.repository.find({
			where: { employeeId },
			order: { from: 'ASC' },
		});
	}

	async findActive(employeeId: number): Promise<SellRequest[]> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return await this.repository.find({
			where: {
				employeeId,
				status: In([SellRequestStatus.PLANNED, SellRequestStatus.ADDED_BY_ADMIN]),
				from: MoreThan(today),
			},
			order: { from: 'ASC' },
		});
	}

	async findFinished(employeeId: number): Promise<SellRequest[]> {
		return await this.repository.find({
			where: { employeeId, status: SellRequestStatus.FINISHED },
			order: { from: 'ASC' },
		});
	}

	async delete(id: number) {
		return await this.repository.update(
			{
				id,
			},
			{
				status: SellRequestStatus.REJECTED_EMPLOYEE,
			}
		);
	}

	async findApprovedSellReqs(employeeId: number, year: number) {
		return await this.findApprovedSellReqsInPeriod(
			employeeId,
			new Date(year, 0, 1),
			new Date(year, 11, 31)
		);
	}

	async findApprovedSellReqsInPeriod(employeeId, from: Date, to: Date) {
		const statusList = [SellRequestStatus.PLANNED, SellRequestStatus.FINISHED];
		return await this.repository.find({
			where: {
				status: In(statusList),
				from: Between(from, to),
				employeeId,
			},
		});
	}

	async findApprovedSellWithVac(employeeId: number, year: number) {
		const firstDayCurrYear = new Date(year, 0, 1);
		const lastDayCurrYear = new Date(year, 11, 31);
		const statusList = [SellRequestStatus.PLANNED, SellRequestStatus.FINISHED];
		return await this.repository.find({
			where: {
				status: In(statusList),
				from: Between(firstDayCurrYear, lastDayCurrYear),
				employeeId,
				vacationId: Not(IsNull()),
			},
		});
	}
}
