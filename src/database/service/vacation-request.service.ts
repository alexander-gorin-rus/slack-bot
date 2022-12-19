import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VacationRequest } from '../entity/vacation-request.entity';
import { Between, In, MoreThanOrEqual, Repository } from 'typeorm';
import { BaseService } from './base.service';
import { VacationRequestStatus } from '../util/vacation-request-status.enum';
import { Employee } from '../entity/employee.entity';
import { settings } from '../../configs/settings';
import { CalendarService } from '../../calendar/calendar.service';

export const APPROVED_ALL_PM_OR_HEAD_ONLY = [
	VacationRequestStatus.HEAD_ONLY_REQUEST,
	VacationRequestStatus.APPROVED_ALL_PM,
];

@Injectable()
export class VacationRequestService extends BaseService<VacationRequest> {
	constructor(
		@InjectRepository(VacationRequest)
		public repository: Repository<VacationRequest>,
		private calendar: CalendarService
	) {
		super();
	}

	export() {
		return this.repository.find({
			relations: ['employee', 'employee.head', 'confirms', 'confirms.manager'],
			order: { id: 'ASC' },
		});
	}

	findNewRequests(): Promise<VacationRequest[] | null> {
		return this.repository.find({
			where: {
				status: VacationRequestStatus.CREATED,
			},
			relations: ['employee', 'confirms', 'confirms.manager'],
		});
	}

	findRejectRequests(): Promise<VacationRequest[]> {
		return this.repository.find({
			where: {
				isRejectVacation: true,
			},
			relations: ['employee', 'confirms', 'confirms.manager'],
		});
	}

	findPMApprovedRequests(): Promise<VacationRequest[]> {
		return this.repository.find({
			where: {
				status: In(APPROVED_ALL_PM_OR_HEAD_ONLY),
			},
			relations: ['employee', 'employee.head', 'confirms', 'confirms.manager'],
		});
	}
	async findVacationRequestsForYear(
		employee: Employee,
		isPersonal?: boolean
	): Promise<VacationRequest[]> {
		const today = isPersonal ? new Date(employee.firstDay) : this.calendar.today();
		const currentYear = today.getFullYear();
		const startMonth = isPersonal ? today.getMonth() : settings.firstMonth;
		const endMonth = isPersonal ? today.getMonth() : settings.lastMonth;
		const startDay = isPersonal ? today.getDate() : settings.firstDay;
		const endDay = isPersonal ? today.getDate() : settings.lastDay;

		const firstDayCurrYear = new Date(currentYear, startMonth, startDay).toISOString().slice(0, 10);
		const lastDayCurrYear = new Date(isPersonal ? currentYear + 1 : currentYear, endMonth, endDay)
			.toISOString()
			.slice(0, 10);
		const statusList = [
			VacationRequestStatus.CREATED,
			VacationRequestStatus.WAIT_PM,
			VacationRequestStatus.APPROVED_ALL_PM,
			VacationRequestStatus.WAIT_HEAD,
			VacationRequestStatus.APPROVED_HEAD,
			VacationRequestStatus.FINISHED,
			VacationRequestStatus.HEAD_ONLY_REQUEST,
		];

		const vacations = await this.repository.find({
			where: {
				employeeId: employee.id,
				// @ts-ignore
				from: Between(firstDayCurrYear, lastDayCurrYear),
				status: In(statusList),
			},
		});

		return vacations;
	}

	findCrossingRequest(
		employee: Employee,
		from: Date,
		to: Date,
		status: 'await' | 'completed'
	): Promise<VacationRequest[]> {
		const qb = this.repository.createQueryBuilder('item');
		// check crossing dates
		qb.andWhere(
			'(item."from" BETWEEN :from AND :to OR item."to" BETWEEN :from AND :to OR :from BETWEEN item."from" AND item."to")'
		);
		qb.andWhere('item.employee = :employee');
		qb.andWhere('item.status IN(:...statuses)');
		qb.setParameter('from', from);
		qb.setParameter('to', to);
		qb.setParameter('employee', employee.id);
		if (status == 'await') {
			qb.setParameter('statuses', [
				VacationRequestStatus.CREATED,
				VacationRequestStatus.WAIT_PM,
				VacationRequestStatus.APPROVED_ALL_PM,
				VacationRequestStatus.WAIT_HEAD,
				VacationRequestStatus.HEAD_ONLY_REQUEST,
				VacationRequestStatus.APPROVED_HEAD,
			]);
		} else if (status == 'completed') {
			qb.setParameter('statuses', [
				VacationRequestStatus.APPROVED_HEAD,
				VacationRequestStatus.ADDED_BY_ADMIN,
				VacationRequestStatus.FINISHED,
			]);
		}
		qb.orderBy('item."from"', 'ASC');

		return qb.getMany();
	}

	findNearRequests(employee: Employee, from: Date, to: Date): Promise<VacationRequest[]> {
		const qb = this.repository.createQueryBuilder('item');
		// check crossing dates
		qb.andWhere(
			'((item."from", item."to") OVERLAPS (:from::DATE - INTERVAL \'3 MONTHS\', :to::DATE + INTERVAL \'3 MONTHS\'))'
		);
		qb.andWhere('item.employee = :employee');
		qb.andWhere('item.status IN(:...statuses)');
		qb.setParameter('from', from);
		qb.setParameter('to', to);
		qb.setParameter('employee', employee.id);
		qb.setParameter('statuses', [
			VacationRequestStatus.CREATED,
			VacationRequestStatus.WAIT_PM,
			VacationRequestStatus.APPROVED_ALL_PM,
			VacationRequestStatus.WAIT_HEAD,
			VacationRequestStatus.APPROVED_HEAD,
			VacationRequestStatus.FINISHED,
		]);

		return qb.getMany();
	}

	async count(employeeId: number): Promise<number> {
		return await this.repository.count({
			where: {
				employeeId,
				status: In([
					VacationRequestStatus.CREATED,
					VacationRequestStatus.WAIT_HEAD,
					VacationRequestStatus.WAIT_PM,
					VacationRequestStatus.APPROVED_ALL_PM,
					VacationRequestStatus.APPROVED_HEAD,
					VacationRequestStatus.HEAD_ONLY_REQUEST,
					VacationRequestStatus.ADDED_BY_ADMIN,
					VacationRequestStatus.CREATED_FOR_SELL,
				]),
				from: MoreThanOrEqual(new Date()),
			},
		});
	}

	async countAll(employeeId: number): Promise<number> {
		return await this.repository.count({
			where: {
				employeeId,
				status: In([
					VacationRequestStatus.APPROVED_HEAD,
					VacationRequestStatus.REJECTED_EMPLOYEE,
					VacationRequestStatus.REJECTED_PM,
					VacationRequestStatus.REJECTED_HEAD,
					VacationRequestStatus.WAIT_PM,
					VacationRequestStatus.WAIT_HEAD,
					VacationRequestStatus.ADDED_BY_ADMIN,
					VacationRequestStatus.HEAD_ONLY_REQUEST,
				]),
			},
		});
	}

	async findAwaitingRequests() {
		const statusList = [
			VacationRequestStatus.WAIT_HEAD,
			VacationRequestStatus.WAIT_PM,
			VacationRequestStatus.HEAD_ONLY_REQUEST,
		];
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

	async changeAwaitingStatusToAutoReject(id: number) {
		return await this.repository.update(
			{
				id,
			},
			{
				status: VacationRequestStatus.AUTO_REJECT,
			}
		);
	}

	async findVacationRequests(
		employeeId: number,
		status: 'wait' | 'approved' | 'rejected' | 'finished' | 'waitAndApproved'
	) {
		let statusList: Array<string>;

		switch (status) {
			case 'wait':
				statusList = [
					VacationRequestStatus.CREATED,
					VacationRequestStatus.WAIT_HEAD,
					VacationRequestStatus.WAIT_PM,
					VacationRequestStatus.APPROVED_ALL_PM,
					VacationRequestStatus.HEAD_ONLY_REQUEST,
				];
				break;
			case 'approved':
				statusList = [VacationRequestStatus.APPROVED_HEAD, VacationRequestStatus.ADDED_BY_ADMIN];
				break;
			case 'waitAndApproved':
				statusList = [
					VacationRequestStatus.CREATED,
					VacationRequestStatus.WAIT_HEAD,
					VacationRequestStatus.WAIT_PM,
					VacationRequestStatus.APPROVED_ALL_PM,
					VacationRequestStatus.APPROVED_HEAD,
					VacationRequestStatus.HEAD_ONLY_REQUEST,
				];
				break;
			case 'rejected':
				statusList = [VacationRequestStatus.REJECTED_HEAD, VacationRequestStatus.REJECTED_PM];
				break;
			case 'finished':
				statusList = [VacationRequestStatus.FINISHED];
				break;
			default:
				break;
		}

		return await this.repository.find({
			where: {
				employeeId: employeeId,
				status: In(statusList),
			},
			order: {
				from: 'ASC',
			},
		});
	}

	async findApprovedRequests() {
		return await this.repository.find({
			where: {
				status: In([VacationRequestStatus.APPROVED_HEAD, VacationRequestStatus.ADDED_BY_ADMIN]),
			},
			relations: ['employee'],
		});
	}

	findHEADApprovedRequest(employeeId: number): Promise<any> {
		return this.repository.findOne({
			where: {
				employeeId,
				status: VacationRequestStatus.APPROVED_HEAD,
			},
			order: {
				from: 'ASC',
			},
		});
	}

	findHEADApprovedRequests(): Promise<VacationRequest[]> {
		return this.repository.find({
			where: {
				status: VacationRequestStatus.APPROVED_HEAD,
			},
			order: {
				from: 'ASC',
			},
			relations: ['employee'],
		});
	}

	findChangedRequest(employeeId: number, from: Date, days: number): Promise<VacationRequest> {
		return this.repository.findOne({
			where: {
				employeeId,
				from,
				days,
			},
			relations: ['confirms', 'confirms.manager'],
		});
	}

	async findAll(employeeId: number): Promise<any> {
		return await this.repository.find({
			where: { employeeId },
			order: { from: 'ASC' },
		});
	}

	async delete(id: number) {
		return await this.repository.update(
			{
				id,
			},
			{
				status: VacationRequestStatus.REJECTED_EMPLOYEE,
				isRejectVacation: true,
			}
		);
	}

	async findOneByVacReqId(id) {
		return await this.repository.findOne({
			where: {
				id,
			},
		});
	}

	// find all approved vacation requests by the HOD
	async findApprovedVacReqs(employeeId: number, year: number) {
		return await this.findApprovedVacReqsInPeriod(
			employeeId,
			new Date(year, 0, 1),
			new Date(year, 11, 31)
		);
	}

	async findApprovedVacReqsInPeriod(employeeId: number, from: Date, to: Date) {
		const statusList = [
			VacationRequestStatus.APPROVED_HEAD,
			VacationRequestStatus.FINISHED,
			VacationRequestStatus.WAIT_PM,
			VacationRequestStatus.WAIT_HEAD,
		];
		return await this.repository.find({
			where: {
				status: In(statusList),
				// @ts-ignore
				// TODO: change 'from' type to Date in entity
				from: Between(from, to),
				employeeId,
			},
		});
	}

	async findVacationsEndedAt(date: Date) {
		/* TODO: replace code below when "to" field becomes `Data`
		to smth like
		```
			const vacations = await this.vacationRequestService.repository.find({
				where: {
					to: Between(today, addDays(today, 1))
				}
			})
		```
		*/
		const day = date.getDate();
		const month = date.getMonth() + 1;
		const year = date.getFullYear();
		return await this.repository
			.createQueryBuilder('vacations')
			.leftJoin('employees', 'vacations.employeeId = employees.id')
			.andWhere(
				'date_part(\'day\', "to") = :day and date_part(\'month\', "to") = :month and date_part(\'year\', "to") = :year',
				{ day, month, year }
			)
			.andWhere('status = :status', { status: VacationRequestStatus.FINISHED })
			.getMany();
	}
}
