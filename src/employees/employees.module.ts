import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';

@Module({
	imports: [],
	providers: [],
	controllers: [EmployeesController],
})
export class EmployeesModule {}
