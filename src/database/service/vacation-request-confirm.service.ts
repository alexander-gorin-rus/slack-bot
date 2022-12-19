import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VacationRequestConfirm } from '../entity/vacation-request-confirm.entity';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';

@Injectable()
export class VacationRequestConfirmService extends BaseService<VacationRequestConfirm> {
	constructor(
		@InjectRepository(VacationRequestConfirm)
		protected repository: Repository<VacationRequestConfirm>
	) {
		super();
	}
}
