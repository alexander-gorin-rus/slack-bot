import { DynamicModule, Global, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { KafkaConfig } from './kafka.config';
import { KafkaController } from './kafka.controller';

@Global()
@Module({})
export class KafkaModule {
	static register(kafkaConfig: KafkaConfig): DynamicModule {
		return {
			global: true,
			module: KafkaModule,
			providers: [
				{
					provide: KafkaService,
					useValue: new KafkaService(kafkaConfig),
				},
			],
			exports: [KafkaService],
			controllers: [KafkaController],
		};
	}
}
