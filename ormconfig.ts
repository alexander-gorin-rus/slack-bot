import * as dotenv from 'dotenv';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenv.config();

const config: DataSourceOptions = {
	type: 'postgres',
	host: process.env.DB_HOST || 'localhost',
	port: +process.env.DB_PORT || 5432,
	username: process.env.DB_USER_NAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	synchronize: false,
	logging: false,
	entities: ['src/database/**/*.entity.ts'],
	migrations: ['src/database/migrations/**/*.ts'],
	subscribers: [],
};

export const dataSource = new DataSource(config);

export default {
	...config,
	cli: {
		migrationsDir: 'src/database/migrations',
		entitiesDir: 'src/database',
	},
} as TypeOrmModuleOptions;
