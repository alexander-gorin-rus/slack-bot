import { Injectable } from '@nestjs/common';
import { BaseService } from './base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from '../entity/email-template.entity';
import { EntityNotFoundException } from '../util/entity-not-found.exception';

@Injectable()
export class EmailTemplateService extends BaseService<EmailTemplate> {
	constructor(
		@InjectRepository(EmailTemplate)
		protected repository: Repository<EmailTemplate>
	) {
		super();
	}

	async getByCode(code: string): Promise<EmailTemplate> {
		const item = await this.repository.findOne({ where: { code } });
		if (item) {
			return item;
		} else {
			throw new EntityNotFoundException(`Entity EmailTemplate not found by code: '${code}'`);
		}
	}
}
