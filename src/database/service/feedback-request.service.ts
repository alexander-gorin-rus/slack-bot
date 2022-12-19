import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackRequest } from '../entity/feedback-request.entity';
import { BaseService } from './base.service';

@Injectable()
export class FeedbackRequestService extends BaseService<FeedbackRequest> {
	constructor(
		@InjectRepository(FeedbackRequest)
		protected repository: Repository<FeedbackRequest>
	) {
		super();
	}
}
