import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackQuestion } from '../entity/feedback-question.entity';
import { BaseService } from './base.service';

@Injectable()
export class FeedbackQuestionService extends BaseService<FeedbackQuestion> {
	constructor(
		@InjectRepository(FeedbackQuestion)
		protected repository: Repository<FeedbackQuestion>
	) {
		super();
	}
}
