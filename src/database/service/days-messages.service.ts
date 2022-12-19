import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { DaysMessages } from '../entity/messages.entity';

@Injectable()
export class DaysMessagesService extends BaseService<DaysMessages> {
	constructor(@InjectRepository(DaysMessages) protected repository: Repository<DaysMessages>) {
		super();
	}

	async updateEntity(entity: DaysMessages): Promise<void> {
		await this.repository.update(entity.employee.id, {
			messageTs: entity.messageTs,
		});
	}
}
