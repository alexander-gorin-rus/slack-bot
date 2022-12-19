import { Module } from '@nestjs/common';
import { EmployeesSubscriber } from './subscribers/employees.subscriber';
import { PositionsSubscriber } from './subscribers/positions.subscriber';

@Module({
	imports: [],
	providers: [EmployeesSubscriber, PositionsSubscriber],
	exports: [],
	controllers: [],
})
export class KafkaSubscribersModule {}
