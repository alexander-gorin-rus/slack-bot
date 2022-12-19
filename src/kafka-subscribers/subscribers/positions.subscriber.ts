import { Injectable } from '@nestjs/common';
import { PositionsService } from '../../database/service/positions.service';
import { SubscribeTo } from '../../kafka/decorators/kafka.decorators';
import { TOPICS_LIST } from '../../configs/topics';
import { KafkaPosition } from '../interfaces/positions.interface';
import * as Sentry from '@sentry/node';
import { AdminLogService } from '../../database/service/admin-log.service';
import { AdminLog } from '../../database/entity/admin-log.entity';
import { AdminLogsSourceEnum } from '../../database/util/admin-logs-source.enum';

@Injectable()
export class PositionsSubscriber {
	constructor(
		private readonly positionsService: PositionsService,
		private readonly adminLogService: AdminLogService
	) {
		Reflect.defineMetadata('context', this, this.positionsProcessing);
	}

	@SubscribeTo(TOPICS_LIST.POSITIONS)
	async positionsProcessing(payload: KafkaPosition) {
		const context = Reflect.getMetadata('context', this.positionsProcessing);
		const positionsService: PositionsService = context.positionsService;
		const adminLogService: AdminLogService = context.adminLogService;
		try {
			const position = await positionsService.findOne({ globalId: payload.globalId });
			const positionData = {
				name: payload.nameEn,
				globalId: payload.globalId,
			};

			const adminLog = new AdminLog();
			adminLog.createdAt = new Date();
			adminLog.resource = TOPICS_LIST.POSITIONS;
			adminLog.source = AdminLogsSourceEnum.TOMOHAWK;

			if (!position) {
				const position = positionsService.create(positionData);
				const savedPosition = await positionsService.save(position);
				adminLog.action = 'new';
				adminLog.record = savedPosition.id.toString();
				adminLog.description = 'Создание позиции';
			} else {
				await positionsService.update({ globalId: payload.globalId }, positionData);
				adminLog.action = 'edit';
				adminLog.record = position.id.toString();
				adminLog.description = 'Обновление позиции';
			}

			await adminLogService.save(adminLog);
		} catch (error) {
			Sentry.captureException({
				message: 'Position cannot be updated or created',
				error,
				positionId: payload.globalId,
				positionName: payload.nameEn,
			});
		}
	}
}
