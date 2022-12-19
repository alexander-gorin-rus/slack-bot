import { Injectable } from '@nestjs/common';
import { SubscribeTo } from '../../kafka/decorators/kafka.decorators';
import { TOPICS_LIST } from '../../configs/topics';
import { EmployeeService } from '../../database/service/employee.service';
import * as Sentry from '@sentry/node';
import { PositionsService } from '../../database/service/positions.service';
import { Position } from '../../database/entity/positions.entity';
import { EmployeesUpdate, EmployeesNew } from '../interfaces/employees.interface';
import { AdminLogService } from '../../database/service/admin-log.service';
import { AdminLog } from '../../database/entity/admin-log.entity';
import { AdminLogsSourceEnum } from '../../database/util/admin-logs-source.enum';
import { Employee } from '../../database/entity/employee.entity';
import { SoloProprietorStatus } from '../../database/util/employee-solo-proprietor-status.enum';

@Injectable()
export class EmployeesSubscriber {
	constructor(
		private readonly employeeService: EmployeeService,
		private readonly positionsService: PositionsService,
		private readonly adminLogService: AdminLogService
	) {
		Reflect.defineMetadata('context', this, this.syncGlobalIdWithEmployee);
		Reflect.defineMetadata('context', this, this.employeeProcessing);
		Reflect.defineMetadata('context', this, this.updateProcessing);
		Reflect.defineMetadata('context', this, this.createProcessing);
		Reflect.defineMetadata('context', this, this.deativateEmployee);
	}

	@SubscribeTo(TOPICS_LIST.SLACK_ACCOUNTS_NEW)
	async syncGlobalIdWithEmployee(payload: { globalId: string; slackId: string }) {
		const context = Reflect.getMetadata('context', this.syncGlobalIdWithEmployee);
		const adminLogService: AdminLogService = context.adminLogService;
		const employee: Employee = await context.employeeService.getBySlackId(payload.globalId);
		if (employee) {
			employee.slackId = payload.slackId;
			employee.active = true;
			await employee.save();
			const adminLog = new AdminLog();
			adminLog.createdAt = new Date();
			adminLog.resource = TOPICS_LIST.SLACK_ACCOUNTS_NEW;
			adminLog.record = employee.id.toString();
			adminLog.action = 'edit';
			adminLog.description = 'Обновление сотрудника';
			adminLog.source = AdminLogsSourceEnum.TOMOHAWK;
			await adminLogService.save(adminLog);
		} else
			Sentry.captureException({
				message: 'Employee not found',
				emploGlobalId: payload.globalId,
				emploSlackId: payload.slackId,
			});
	}

	@SubscribeTo(TOPICS_LIST.EMPLOYEES_UPDATE)
	async updateProcessing(payload: EmployeesUpdate) {
		const context = Reflect.getMetadata('context', this.updateProcessing);
		await context.employeeProcessing(payload);
	}

	@SubscribeTo(TOPICS_LIST.EMPLOYEES_NEW)
	async createProcessing(payload: EmployeesUpdate) {
		const context = Reflect.getMetadata('context', this.createProcessing);
		await context.employeeProcessing(payload);
	}

	@SubscribeTo(TOPICS_LIST.EMPLOYEES_DISMISSAL)
	async deativateEmployee(payload: { globalId: string; email: string }) {
		const context = Reflect.getMetadata('context', this.deativateEmployee);
		const employeeService: EmployeeService = context.employeeService;
		const adminLogService: AdminLogService = context.adminLogService;
		const employeeExist = await employeeService.findOne({ globalId: payload.globalId });
		if (employeeExist) {
			employeeExist.active = false;
			await employeeService.save(employeeExist);
			const adminLog = new AdminLog();
			adminLog.createdAt = new Date();
			adminLog.resource = TOPICS_LIST.EMPLOYEES_DISMISSAL;
			adminLog.record = employeeExist.id.toString();
			adminLog.action = 'dismissal';
			adminLog.description = 'Деактивация сотрудника';
			adminLog.source = AdminLogsSourceEnum.TOMOHAWK;
			await adminLogService.save(adminLog);
		} else {
			Sentry.captureException({
				message: 'Employee not found to deactivate',
				emploGlobalId: payload.globalId,
				email: payload.email,
			});
		}
	}

	async employeeProcessing(payload: EmployeesUpdate | EmployeesNew) {
		const context = Reflect.getMetadata('context', this.employeeProcessing);
		const employeeService: EmployeeService = context.employeeService;
		const positionsService: PositionsService = context.positionsService;
		const adminLogService: AdminLogService = context.adminLogService;
		const head = await employeeService.findOne({ globalId: payload.supervisorId });
		try {
			const position = await positionsService.findOne({ globalId: payload.positionId });
			const employeeExist = await employeeService.findOne({ globalId: payload.globalId });
			const adminLog = new AdminLog();
			adminLog.createdAt = new Date();
			adminLog.resource = TOPICS_LIST.SLACK_ACCOUNTS_NEW;
			adminLog.source = AdminLogsSourceEnum.TOMOHAWK;

			if (!employeeExist) {
				const employeeData = context.getEmployeeData(payload, position);
				employeeData.active = true;
				employeeData.headId = head.id;
				const savedUser = await employeeService.save(employeeData);
				adminLog.record = savedUser.id.toString();
				adminLog.description = 'Обновление сотрудника';
				adminLog.action = 'create';
			} else {
				const employeeData = context.getEmployeeData(payload, position);
				employeeData.headId = head.id;
				await employeeService.update({ id: employeeExist.id }, employeeData);
				adminLog.record = employeeExist.id.toString();
				adminLog.description = 'Создание сотрудника';
				adminLog.action = 'edit';
			}

			await adminLogService.save(adminLog);
		} catch (error) {
			Sentry.captureException({
				message: 'Employee cannot be updated or created',
				error,
				employeeGlobalId: payload.globalId,
				email: payload.email,
			});
		}
	}

	getEmployeeData(payload: EmployeesUpdate, position?: Position) {
		const result = {
			email: payload.email,
			globalId: payload.globalId,
			realNameRu: `${payload.lastName} ${payload.firstName}`,
			isLPR: payload.isLpr,
			days: 0,
			firstDay: payload.firstDay,
			SPStatus:
				payload.employmentTypeId === 1
					? SoloProprietorStatus.DEFAULT_EMPLOYEE
					: SoloProprietorStatus.SOLO_PROPRIETOR,
			position,
			grade: payload.grade,
		};

		return result;
	}
}
