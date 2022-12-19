import React, { FC, useEffect, useState } from 'react';
import { BasePropertyProps } from 'adminjs';
import { Multiselect } from 'multiselect-react-dropdown';
import { Label, Box, colors } from '@adminjs/design-system';

const MultiSelectPm: FC<BasePropertyProps> = (props) => {
	const { property, onChange, record } = props;

	const [pmList, setPmList] = useState([]);

	const getEmployeeList = async () => {
		const response = await fetch('/api/pm-employees', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return response.json();
	};

	useEffect(() => {
		let isRequestPerformed = true;

		if (isRequestPerformed) {
			getEmployeeList().then((employees) => {
				const pms = employees.filter((employee) => employee.isPm);
				setPmList(pms);
			});
			record.params.pmList = [];
		}

		return () => {
			isRequestPerformed = false;
		};
	}, []);

	const handleSelect = (pmArgList) => {
		// clean up the record for the pmListIds in format from AdminJS

		Object.entries(record.params).forEach(([key]) => {
			if (key.includes('pmList')) {
				delete record.params[key];
			}
		});

		onChange(
			'pmList',
			pmArgList.map((pm) => pm.id)
		);
	};

	const handleRemove = (pmArgList) => {
		// clean up the record for the pmListIds in format from AdminJS

		Object.entries(record.params).forEach(([key]) => {
			if (key.includes('pmList')) {
				delete record.params[key];
			}
		});

		onChange(
			'pmList',
			pmArgList.map((pm) => pm.id)
		);
	};

	return (
		<Box marginBottom="xxl">
			<Label>
				{property.label}{' '}
				<span style={{ fontSize: '0.625rem', color: colors.grey60 }}>
					(можно выбрать несколько)
				</span>
			</Label>
			<Multiselect
				options={pmList.map((pm) => ({
					title: pm.realNameRu,
					id: pm.id,
				}))}
				displayValue={'title'}
				selectedValues={record.params.pmList}
				onSelect={handleSelect}
				onRemove={handleRemove}
				placeholder="Выберите ПМов"
			/>
		</Box>
	);
};

export default MultiSelectPm;
