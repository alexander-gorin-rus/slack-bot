import { cleanEnv, str, bool, num, json } from 'envalid';

export const env = cleanEnv(process.env, {
	BOT_TOKEN: str(),
	SLACK_APP_TOKEN: str(),
	DB_USER_NAME: str(),
	DB_HOST: str({ default: 'localhost' }),
	DB_PORT: num({ default: 5432 }),
	DB_PASSWORD: str(),
	DB_NAME: str(),
	DB_TYPE: str({ default: 'postgres' }),
	SOCKET_MODE: bool(),
	SENTRY_DSN: str({ default: '' }),
	LOKI_URL: str({ default: '' }),
	LOKI_AUTH: str({ default: '' }),
	LOKI_JOB_NAME: str({ default: '' }),
	LOKI_LATENCY_VECTOR: str({ default: '50,100,200,500' }),
	API_ENDPOINT: str({ default: '' }),
	KAFKA_CLIENT_ID: str({ default: '' }),
	KAFKA_GROUP_ID: str({ default: '' }),
	KAFKA_BROKERS: json({ default: [] }),
	KAFKA_INIT_MIGRATION: bool({ default: false }),
	HEALTH_CHECK_URI: str({ default: '' }),
});
