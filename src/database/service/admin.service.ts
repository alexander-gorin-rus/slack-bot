import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository, UpdateResult } from 'typeorm';
import { Admin } from '../entity/admin.entity';
import { BaseService } from './base.service';

@Injectable()
export class AdminService extends BaseService<Admin> {
	constructor(@InjectRepository(Admin) protected repository: Repository<Admin>) {
		super();
	}

	async changePassword(id: number, password: string): Promise<UpdateResult> {
		return await this.repository.update(id, { password });
	}

	async isEmailRegistered(id: number, email: string): Promise<boolean> {
		const entity = await this.repository.findOne({ where: { email, id: Not(id) } });
		return !!entity;
	}

	async isNameRegistered(id: number, name: string): Promise<boolean> {
		const entity = await this.repository.findOne({ where: { name, id: Not(id) } });
		return !!entity;
	}
}
