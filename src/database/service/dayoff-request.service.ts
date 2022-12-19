import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DayoffRequest } from '../entity/dayoff-request.entity';
import { DayoffRequestStatus } from '../util/dayoff-request-status.enum';
import { BaseService } from './base.service';
import { Employee } from '../entity/employee.entity';

export const APPROVED_ALL_PMS_OR_HEAD_ONLY = [
	DayoffRequestStatus.HEAD_ONLY_REQUEST,
	DayoffRequestStatus.APPROVED_ALL_PM,
];

@Injectable()
export class DayoffRequestService extends BaseService<DayoffRequest> {
	constructor(
		@InjectRepository(DayoffRequest)
		protected repository: Repository<DayoffRequest>
	) {
		super();
	}

	export() {
		return this.repository.find({
			relations: ['employee', 'employee.head', 'confirms', 'confirms.manager'],
			order: { id: 'ASC' },
		});
	}

	findNewRequests(): Promise<DayoffRequest[]> {
		return this.repository.find({
			where: {
				status: DayoffRequestStatus.CREATED,
			},
			relations: ['employee', 'confirms', 'confirms.manager'],
		});
	}

	findRejectedRequests(): Promise<DayoffRequest[]> {
		return this.repository.find({
			where: {
				isRejectDayOff: true,
			},
			relations: ['employee', 'confirms', 'confirms.manager'],
		});
	}

	findPMApprovedRequests(): Promise<DayoffRequest[]> {
		return this.repository.find({
			where: {
				status: In(APPROVED_ALL_PMS_OR_HEAD_ONLY),
			},
			relations: ['employee', 'employee.head', 'confirms', 'confirms.manager'],
		});
	}

	async findAwaitingRequests() {
		const statusList = [DayoffRequestStatus.WAIT_HEAD, DayoffRequestStatus.WAIT_PM];
		return await this.repository.find({
			where: {
				status: In(statusList),
			},
			order: {
				from: 'ASC',
			},
			relations: [
				'employee',
				'employee.head',
				'confirms',
				'confirms.manager',
				'employee.head.head',
			],
		});
	}

	findCrossingRequest(
		employee: Employee,
		from: Date,
		to: Date,
		status: 'await' | 'completed'
	): Promise<DayoffRequest[]> {
		const qb = this.repository.createQueryBuilder('item');
		// check crossing dates
		qb.andWhere(
			'(item."from" BETWEEN :from AND :to OR item."to" BETWEEN :from AND :to OR :from BETWEEN item."from" AND item."to")',
			{ from, to }
		);
		qb.andWhere('item.employee = :employee', { employee: employee.id });
		qb.andWhere('item.status IN(:...statuses)');
		if (status == 'await') {
			qb.setParameter('statuses', [
				DayoffRequestStatus.CREATED,
				DayoffRequestStatus.WAIT_PM,
				DayoffRequestStatus.APPROVED_ALL_PM,
				DayoffRequestStatus.WAIT_HEAD,
				DayoffRequestStatus.HEAD_ONLY_REQUEST,
			]);
		} else if (status == 'completed') {
			qb.setParameter('statuses', [
				DayoffRequestStatus.APPROVED_HEAD,
				DayoffRequestStatus.ADDED_BY_ADMIN,
				DayoffRequestStatus.FINISHED,
			]);
		}
		return qb.getMany();
	}
	async count(employeeId: number): Promise<number> {
		return await this.repository.count({
			where: {
				employeeId,
				status: In([
					DayoffRequestStatus.CREATED,
					DayoffRequestStatus.WAIT_HEAD,
					DayoffRequestStatus.WAIT_PM,
					DayoffRequestStatus.APPROVED_ALL_PM,
					DayoffRequestStatus.APPROVED_HEAD,
					DayoffRequestStatus.HEAD_ONLY_REQUEST,
					DayoffRequestStatus.ADDED_BY_ADMIN,
				]),
			},
		});
	}

	async countAll(employeeId: number): Promise<number> {
		return await this.repository.count({
			where: {
				employeeId,
				status: In([
					DayoffRequestStatus.APPROVED_HEAD,
					DayoffRequestStatus.REJECTED_EMPLOYEE,
					DayoffRequestStatus.REJECTED_PM,
					DayoffRequestStatus.REJECTED_HEAD,
					DayoffRequestStatus.WAIT_PM,
					DayoffRequestStatus.WAIT_HEAD,
					DayoffRequestStatus.ADDED_BY_ADMIN,
					DayoffRequestStatus.CANCELLED_BY_ADMIN,
					DayoffRequestStatus.HEAD_ONLY_REQUEST,
				]),
			},
		});
	}

	async changeAwaitingStatusToAutoReject(id: number) {
		return await this.repository.update(
			{
				id,
			},
			{
				status: DayoffRequestStatus.AUTO_REJECT,
				isRejectDayOff: true,
			}
		);
	}

	async delete(id: number) {
		return await this.repository.update(
			{
				id,
			},
			{
				isRejectDayOff: true,
				status: DayoffRequestStatus.REJECTED_EMPLOYEE,
			}
		);
	}

	async findOneByReqId(id) {
		return await this.repository.findOne({
			where: {
				id,
			},
		});
	}

	async findApprovedRequests() {
		return await this.repository.find({
			where: {
				status: In([DayoffRequestStatus.APPROVED_HEAD, DayoffRequestStatus.ADDED_BY_ADMIN]),
			},
			relations: ['employee'],
		});
	}

	async findDayoffRequests(employeeId: number, status: string) {
		let statusList: Array<string>;
		switch (status) {
			case 'wait':
				statusList = [
					DayoffRequestStatus.CREATED,
					DayoffRequestStatus.WAIT_HEAD,
					DayoffRequestStatus.WAIT_PM,
					DayoffRequestStatus.APPROVED_ALL_PM,
					DayoffRequestStatus.HEAD_ONLY_REQUEST,
				];
				break;
			case 'approved':
				statusList = [DayoffRequestStatus.APPROVED_HEAD, DayoffRequestStatus.ADDED_BY_ADMIN];
				break;
			case 'waitAndApproved':
				statusList = [
					DayoffRequestStatus.CREATED,
					DayoffRequestStatus.WAIT_HEAD,
					DayoffRequestStatus.WAIT_PM,
					DayoffRequestStatus.APPROVED_ALL_PM,
					DayoffRequestStatus.APPROVED_HEAD,
					DayoffRequestStatus.HEAD_ONLY_REQUEST,
				];
				break;
			case 'rejected':
				statusList = [
					DayoffRequestStatus.REJECTED_HEAD,
					DayoffRequestStatus.REJECTED_PM,
					DayoffRequestStatus.CANCELLED_BY_ADMIN,
					DayoffRequestStatus.REJECTED_EMPLOYEE,
					DayoffRequestStatus.AUTO_REJECT,
				];
				break;
			case 'finished':
				statusList = [DayoffRequestStatus.FINISHED];
				break;
			default:
				break;
		}

		const result = await this.repository.find({
			where: {
				employeeId: employeeId,
				status: In(statusList),
			},
			order: {
				from: 'ASC',
			},
		});

		return result;
	}

	async findDayOffsEndedAt(date: Date) {
		const day = date.getDate();
		const month = date.getMonth() + 1;
		const year = date.getFullYear();
		return await this.repository
			.createQueryBuilder('dayoff')
			.leftJoin('employees', 'dayoff.employeeId = employees.id')
			.andWhere(
				'date_part(\'day\', "to") = :day and date_part(\'month\', "to") = :month and date_part(\'year\', "to") = :year',
				{ day, month, year }
			)
			.andWhere('status = :status', { status: DayoffRequestStatus.FINISHED })
			.getMany();
	}
}
