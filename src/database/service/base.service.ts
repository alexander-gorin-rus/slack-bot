import { DeepPartial } from 'typeorm/common/DeepPartial';
import { SaveOptions } from 'typeorm/repository/SaveOptions';
import { EntityNotFoundException } from '../util/entity-not-found.exception';
import { EntityManager, FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { ObjectID } from 'typeorm/driver/mongodb/typings';
import { FindOneOptions } from 'typeorm/find-options/FindOneOptions';

class repo<TEntity> {
	protected repository: Repository<TEntity>;
}

export class BaseService<TEntity> extends repo<TEntity> {
	async save<T extends DeepPartial<TEntity> = TEntity>(
		entity: T,
		options?: SaveOptions & {
			reload: false;
		}
	) {
		return await this.repository.save<T>(entity, options);
	}

	async update(where: Partial<TEntity>, options?: Partial<TEntity>): Promise<TEntity> {
		// @ts-ignore
		return await this.repository.update<T>(where, options);
	}

	async find(options: FindManyOptions<Partial<TEntity>>): Promise<TEntity[]> {
		return await this.repository.find(options);
	}

	create(options: DeepPartial<TEntity>): TEntity {
		return this.repository.create(options);
	}

	async getById(id: number, relations: string[] = []): Promise<TEntity> {
		// @ts-ignore
		const obj = await this.repository.findOne({ where: { id }, relations });

		if (obj) {
			return obj;
		} else {
			const name = typeof this.repository.create();
			throw new EntityNotFoundException(`Entity ${name} not found by id:${id}`);
		}
	}

	async transaction(fn: (entityManager: EntityManager) => Promise<void>): Promise<void> {
		await this.repository.manager.transaction(fn);
	}

	async findOne(
		id?: string | number | Date | ObjectID | FindOptionsWhere<TEntity>,
		options?: FindOneOptions<TEntity>
	): Promise<TEntity | undefined> {
		if (typeof id === 'object') {
			// @ts-ignore
			return await this.repository.findOne({ where: { ...id } }, options);
		} else {
			// @ts-ignore
			return await this.repository.findOne({ where: { id } }, options);
		}
	}
}
