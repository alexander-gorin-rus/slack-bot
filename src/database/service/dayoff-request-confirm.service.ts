import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DayoffRequestConfirm } from '../entity/dayoff-request-confirm.entity';
import { BaseService } from './base.service';

@Injectable()
export class DayoffRequestConfirmService extends BaseService<DayoffRequestConfirm> {
	constructor(
		@InjectRepository(DayoffRequestConfirm)
		protected repository: Repository<DayoffRequestConfirm>
	) {
		super();
	}
}
