import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka, Producer } from 'kafkajs';
import { env } from '../configs/env';
import { logger } from '../app.logger';
import { SUBSCRIBER_FN_REF_MAP, SUBSCRIBER_OBJ_REF_MAP } from './decorators/kafka.decorators';
import { KafkaConfig } from './kafka.config';
import * as Sentry from '@sentry/node';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
	private kafka: Kafka;
	private producer: Producer;
	private consumer: Consumer;
	private readonly consumerSuffix = '-' + 'chatbot';

	constructor(private kafkaConfig: KafkaConfig) {
		this.kafka = new Kafka({
			clientId: this.kafkaConfig.clientId,
			brokers: this.kafkaConfig.brokers,
		});
		this.producer = this.kafka.producer();
		this.consumer = this.kafka.consumer({
			groupId: this.kafkaConfig.groupId + this.consumerSuffix,
		});
	}

	async onModuleInit() {
		logger.debug('START KAFKA INIT');
		await this.connect();
		SUBSCRIBER_FN_REF_MAP.forEach((functionRef, topic) => {
			// attach the function with kafka topic name
			this.bindAllTopicToConsumer(functionRef, topic);
		});

		await this.consumer.run({
			eachBatchAutoResolve: false,
			autoCommit: false,
			eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
				for (const message of batch.messages) {
					if (!isRunning() || isStale()) break;
					const functionRef = SUBSCRIBER_FN_REF_MAP.get(batch.topic);
					const object = SUBSCRIBER_OBJ_REF_MAP.get(batch.topic);
					// bind the subscribed functions to topic
					let messageBody;
					try {
						messageBody = JSON.parse(message.value.toString());
					} catch (error) {
						messageBody = message.value.toString();
					}
					await functionRef.apply(object, [messageBody]);
					resolveOffset(message.offset);
					const messageOffset = (parseInt(message.offset) + 1).toString();
					await this.consumer.commitOffsets([
						{
							topic: batch.topic,
							offset: messageOffset,
							partition: batch.partition,
						},
					]);
					await heartbeat();
				}
			},
		});
		logger.debug('END KAFKA INIT');
	}

	async onModuleDestroy() {
		await this.disconnect();
	}

	async disconnect() {
		await this.producer.disconnect();
		await this.consumer.disconnect();
	}

	async connect() {
		await this.producer.connect();
		await this.consumer.connect();
	}

	async bindAllTopicToConsumer(callback, _topic) {
		await this.consumer.subscribe({
			topic: _topic,
			fromBeginning: env.KAFKA_INIT_MIGRATION,
		});
	}

	async sendMessage(kafkaTopic: string, kafkaMessage: any) {
		await this.producer.connect();
		const metadata = await this.producer
			.send({
				topic: kafkaTopic,
				messages: [{ value: JSON.stringify(kafkaMessage) }],
			})
			.catch((e) => Sentry.captureException(e));
		await this.producer.disconnect();
		return metadata;
	}
}
