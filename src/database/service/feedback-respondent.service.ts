import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackRespondent } from '../entity/feedback-respondent.entity';
import { BaseService } from './base.service';

@Injectable()
export class FeedbackRespondetService extends BaseService<FeedbackRespondent> {
	constructor(
		@InjectRepository(FeedbackRespondent)
		protected repository: Repository<FeedbackRespondent>
	) {
		super();
	}
}
