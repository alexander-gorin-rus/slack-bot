import { ActionProps } from 'adminjs';
import React, { useEffect, useState } from 'react';
import { VacationRequest } from 'src/database/entity/vacation-request.entity';
import { CSVLink } from 'react-csv';
import { Button, Loader } from '@adminjs/design-system';
import { format } from 'date-fns';

enum ExportResource {
	VACATION = 'VacationRequest',
	DAYOFF = 'DayoffRequest',
	SELL = 'SellRequest',
}

interface ResourceProp {
	type: string;
	api: string;
	filename: string;
}

interface ApiResponse {
	records: VacationRequest[];
}
interface Header {
	label: string;
	key: keyof IRecord;
}
type Headers = Header[];

const ResourceProps: { [key in ExportResource]: ResourceProp } = {
	VacationRequest: {
		type: 'Отпуск',
		api: '/api/export-vacation',
		filename: 'запросы-на-отпуск.csv',
	},
	DayoffRequest: {
		type: 'Отгул',
		api: '/api/export-dayoff',
		filename: 'запросы-на-отгул.csv',
	},
	SellRequest: {
		type: 'Продажа',
		api: '/api/export-sell',
		filename: 'запросы-на-продажу-отпуска.csv',
	},
};

function getProp(resource: ExportResource): ResourceProp {
	return ResourceProps[resource];
}

interface IRecord {
	id: number;
	fio: string;
	email: string;
	type: string;
	from: string;
	days: number;
	status: string;
	createdAt: string;
	head?: string;
	pms?: string;
}

function formatDate(isoDate: string): string {
	return format(new Date(isoDate), 'dd-MM-yyyy');
}

function formatRecords(records: VacationRequest[], resource: ExportResource): IRecord[] {
	return records.map((rec) => ({
		id: rec.id,
		fio: rec.employee.realNameRu,
		email: rec.employee.email,
		type: getProp(resource).type,
		from: formatDate(rec.from),
		days: rec.days,
		// rec.status is formatted entity status from backend
		status: rec.status,
		createdAt: formatDate(rec.createdAt as any as string),
		...(resource !== ExportResource.SELL ? { head: rec.employee.head?.realNameRu } : {}),
		...(resource !== ExportResource.SELL
			? { pms: rec.confirms.map((e) => e.manager.realNameRu).join(', ') }
			: {}),
	}));
}

function getHeaders(resource: ExportResource): Headers {
	const commonHeaders: Headers = [
		{ label: 'id события', key: 'id' },
		{ label: 'Фамилия Имя', key: 'fio' },
		{ label: 'Почта сотрудника', key: 'email' },
		{ label: 'Тип события', key: 'type' }, // продажа/отпуск/отгул
		{ label: 'Первый день события', key: 'from' },
		{ label: 'Количество дней', key: 'days' },
		{ label: 'Статус', key: 'status' }, // отменен/заапрувлен кем-то
		{ label: 'Дата создания', key: 'createdAt' },
	];
	const headers =
		resource !== ExportResource.SELL
			? commonHeaders.concat([
					{ label: 'Руководитель', key: 'head' },
					{ label: 'Выбранные ПМы', key: 'pms' as keyof IRecord },
			  ])
			: commonHeaders;
	return headers;
}

const CSVExport = (props: ActionProps) => {
	const resource = props.resource.id as ExportResource;
	const properties = getProp(resource);
	const filename = properties.filename;

	const headers = getHeaders(resource);
	const [records, setRecords] = useState([] as IRecord[]);
	const [isLoading, setLoading] = useState(true);

	const fetchData = async (): Promise<ApiResponse> => {
		const response = await fetch(properties.api, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return JSON.parse((await response.json()).body);
	};

	useEffect(() => {
		fetchData().then((data: ApiResponse) => {
			setLoading(true);
			setRecords(formatRecords(data.records, resource));
			setLoading(false);
		});
	}, []);

	return isLoading ? (
		<Loader></Loader>
	) : (
		<CSVLink data={records} filename={filename} headers={headers}>
			<Button>Скачать отчет</Button>
		</CSVLink>
	);
};

export { CSVExport };
export default CSVExport;
