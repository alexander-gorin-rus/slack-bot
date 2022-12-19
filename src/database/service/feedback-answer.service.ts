import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackAnswer } from '../entity/feedback-answer.entity';
import { BaseService } from './base.service';

@Injectable()
export class FeedbackAmswerService extends BaseService<FeedbackAnswer> {
	constructor(
		@InjectRepository(FeedbackAnswer)
		protected repository: Repository<FeedbackAnswer>
	) {
		super();
	}
}
