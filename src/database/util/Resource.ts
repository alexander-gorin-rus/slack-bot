import ValidationError, { BaseProperty, BaseRecord, BaseResource, flat } from 'adminjs';
import { Connection, Repository } from 'typeorm';
import safeParseNumber from '@adminjs/typeorm/lib/utils/safe-parse-number';
import { convertFilter } from '@adminjs/typeorm/lib/utils/filter/filter.converter';
import { Property } from '@adminjs/typeorm/lib/Property';

export class Resource extends BaseResource {
	private propsObject;
	private model: any;

	static connection: Connection;
	private repository: Repository<unknown>;
	static validate: any;

	constructor(model) {
		super(model);
		this.model = model;
		this.repository = Resource.connection.getRepository(model);
		this.propsObject = this.prepareProps();
	}

	static setConnection(c: Connection) {
		Resource.connection = c;
	}

	// @ts-ignore
	databaseName() {
		return Resource.connection.options.database || 'typeorm';
	}
	databaseType() {
		return Resource.connection.options.type || 'typeorm';
	}
	name() {
		return this.model.name;
	}
	id() {
		return this.model.name;
	}
	properties(): BaseProperty[] {
		// @ts-ignore
		return [...Object.values(this.propsObject)];
	}
	property(path) {
		return this.propsObject[path];
	}
	async count(filter) {
		return await this.repository.count({
			where: convertFilter(filter),
		});
	}

	async find(filter, params) {
		const { limit = 10, offset = 0, sort = {} } = params;
		const { direction, sortBy } = sort;
		const instances = await this.repository.find({
			where: convertFilter(filter),
			take: limit,
			skip: offset,
			order: {
				[sortBy]: (direction || 'asc').toUpperCase(),
			},
		});
		// @ts-ignore
		return instances.map((instance) => new BaseRecord(instance, this));
	}
	async findOne(id) {
		const instance = await this.repository.findOne({ where: { id } });
		if (!instance) {
			return null;
		}
		// @ts-ignore
		return new BaseRecord(instance, this);
	}
	async findMany(ids) {
		const instances = await this.repository.findByIds(ids);
		// @ts-ignore
		return instances.map((instance) => new BaseRecord(instance, this));
	}
	async create(params) {
		const instance = await this.repository.create(this.prepareParams(params));
		await this.validateAndSave(instance);
		return instance;
	}
	async update(pk, params = {}) {
		const instance = await this.repository.findOne({ where: { id: pk } });
		if (instance) {
			const preparedParams = flat.unflatten(this.prepareParams(params));
			Object.keys(preparedParams).forEach((paramName) => {
				instance[paramName] = preparedParams[paramName];
			});
			await this.validateAndSave(instance);
			return instance;
		}
		throw new Error('Instance not found.');
	}
	async delete(pk) {
		try {
			await this.repository.delete(pk);
		} catch (error) {
			if (error.name === 'QueryFailedError') {
				throw new ValidationError(
					{},
					// @ts-ignore
					{
						type: 'QueryFailedError',
						message: error.message,
					}
				);
			}
			throw error;
		}
	}
	prepareProps(): any {
		const { columns } = this.repository.metadata;
		return columns.reduce((memo, col, index) => {
			const property = new Property(col, index);
			return Object.assign(Object.assign({}, memo), {
				[property.path()]: property,
			});
		}, {});
	}
	/** Converts params from string to final type */
	prepareParams(params) {
		const preparedParams = Object.assign({}, params);
		this.properties().forEach((property) => {
			const param = flat.get(preparedParams, property.path());
			const key = property.path();
			// eslint-disable-next-line no-continue
			if (param === undefined) {
				return;
			}
			const type = property.type();
			if (type === 'mixed') {
				preparedParams[key] = param;
			}
			if (type === 'number') {
				if (property.isArray()) {
					preparedParams[key] = param ? param.map((p) => safeParseNumber(p)) : param;
				} else {
					preparedParams[key] = safeParseNumber(param);
				}
			}
			if (type === 'reference') {
				if (param === null) {
					// @ts-ignore
					preparedParams[property.column.propertyName] = null;
				} else {
					// @ts-ignore
					const [ref, foreignKey] = property.column.propertyPath.split('.');
					// @ts-ignore
					const id = property.column.type === Number ? Number(param) : param;
					preparedParams[ref] = foreignKey
						? {
								[foreignKey]: id,
						  }
						: id;
				}
			}
		});
		return preparedParams;
	}
	// eslint-disable-next-line class-methods-use-this
	async validateAndSave(instance) {
		/*if (Resource.validate) {
        const errors = yield Resource.validate(instance);
        if (errors && errors.length) {
          const validationErrors = errors.reduce((memo, error) => (Object.assign(Object.assign({}, memo), { [error.property]: {
              type: Object.keys(error.constraints)[0],
              message: Object.values(error.constraints)[0],
            } })), {});
          throw new adminjs_1.ValidationError(validationErrors);
        }
      }*/
		try {
			await this.repository.save(instance);
		} catch (error) {
			if (error.name === 'QueryFailedError') {
				throw new ValidationError({
					[error.column]: {
						type: 'QueryFailedError',
						message: error.message,
					},
				});
			}
		}
	}
	static isAdapterFor(rawResource) {
		try {
			return !!Resource.connection.getRepository(rawResource);
		} catch (e) {
			return false;
		}
	}
}
