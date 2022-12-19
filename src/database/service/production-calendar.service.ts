import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { ProductionCalendar } from '../entity/production-calendar.entity';
import { NONWORKINGDAY2022 } from './production-calendar-data';

interface IProdCalendarService {
	getCalendar: (year?: number) => Promise<ProductionCalendar[]>;
	getByYear: (year) => Promise<ProductionCalendar[]>;
}

@Injectable()
export class ProdCalendarService
	extends BaseService<ProductionCalendar>
	implements IProdCalendarService
{
	constructor(
		@InjectRepository(ProductionCalendar)
		protected repository: Repository<ProductionCalendar>
	) {
		super();
	}

	/**
	 * Adds new year to storage
	 * @param year
	 */
	async addYear(year: number) {
		return await this.repository.insert({ year: String(year), nonWorkingDays: '[]' });
	}

	async getCalendar(year): Promise<ProductionCalendar[]> {
		const condition: { active: boolean; year?: string } = { active: true };
		if (year) condition.year = String(year);
		return await this.repository.find({
			where: condition,
		});
	}

	async getAllCalendars(): Promise<ProductionCalendar[]> {
		return await this.repository.find({
			where: { active: true },
		});
	}

	async getByYear(year): Promise<ProductionCalendar[]> {
		const calendar = await this.repository.find({
			where: { year: String(year) },
		});
		if (calendar) {
			return calendar;
		}
	}
}

@Injectable()
export class ProdCalendarTestService implements IProdCalendarService {
	private data: ProductionCalendar[] = [
		{ active: true, id: 1, year: '2021', nonWorkingDays: '[]' },
		{ active: true, id: 2, year: '2022', nonWorkingDays: JSON.stringify(NONWORKINGDAY2022) },
		{ active: false, id: 3, year: '2023', nonWorkingDays: '[]' },
	] as ProductionCalendar[];

	async getCalendar(year?: number): Promise<ProductionCalendar[]> {
		return await this.data.filter((e) => e.year == String(year) && e.active);
	}

	async getByYear(year): Promise<ProductionCalendar[]> {
		return await this.data.filter((e) => e.year == String(year));
	}
}
