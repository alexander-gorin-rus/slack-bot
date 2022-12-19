import { Injectable } from '@nestjs/common';
import { BaseService } from './base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminLog } from '../entity/admin-log.entity';

@Injectable()
export class AdminLogService extends BaseService<AdminLog> {
	constructor(@InjectRepository(AdminLog) protected repository: Repository<AdminLog>) {
		super();
	}

	async createLog(originalResponse, request, context) {
		if (
			(request.method === 'post' &&
				originalResponse.record &&
				!Object.keys(originalResponse.record.errors).length) ||
			context.action.name === 'delete'
		) {
			const log = new AdminLog();
			log.adminId = context.currentAdmin && context.currentAdmin.id;
			log.resource = context.resource.id();
			log.record = context.record && context.record.id();
			log.action = context.action.name;
			await this.save(log);
		}
		return originalResponse;
	}
}
