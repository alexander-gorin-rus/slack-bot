import { Controller, Get } from '@nestjs/common';
import { EmployeeService } from '../database/service/employee.service';

@Controller('/employees')
export class EmployeesController {
	constructor(private employeesService: EmployeeService) {}

	@Get('/getPMEmployees')
	async getPMEmployees() {
		const employees = await this.employeesService.getAll();
		return employees;
	}

	@Get('/getEmployees')
	async getEmployees() {
		return await this.employeesService.getAll();
	}
}
