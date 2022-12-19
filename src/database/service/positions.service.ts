import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../entity/positions.entity';
import { BaseService } from './base.service';

@Injectable()
export class PositionsService extends BaseService<Position> {
	constructor(
		@InjectRepository(Position)
		protected repository: Repository<Position>
	) {
		super();
	}
}
