import React, { FC, useEffect, useState } from 'react';
import { BasePropertyProps } from 'adminjs';
import Select from 'react-select';
import { Label, Box } from '@adminjs/design-system';

const MultiSelectHead: FC<BasePropertyProps> = (props) => {
	const { property, onChange, record } = props;
	const [employeeList, setEmployeeList] = useState([]);
	const [values, setValues] = useState([]);
	const [value, setValue] = useState();
	const [errors, setErrors] = useState(null);

	const handleChange = (selected) => {
		setValue(selected);
		onChange(property.path, selected.value);
	};
	const getEmployeeList = async () => {
		const response = await fetch('/api/employees', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		const result = response.json();
		return result;
	};

	useEffect(() => {
		getEmployeeList().then((employee) => {
			setEmployeeList(employee);
		});
	}, []);

	useEffect(() => {
		setValues(
			employeeList
				.filter((el) => {
					if (el.id === record?.params?.id) {
						return el;
					}
					if (el.headId !== record?.params?.id) {
						return el;
					}
				})
				.map((el) => ({ label: el.realNameRu, value: el.id }))
		);
	}, [employeeList]);

	// useEffect(() => {
	// 	setValue(values.filter((el) => el.value === record?.params?.employee.id)[0]);
	// }, [values]);

	useEffect(() => {
        console.log(record);
		if (record.errors.headId !== undefined) {
			setErrors(record.errors.headId);
		} else {
			setErrors(null);
		}
	}, [record]);

	return (
		<Box marginBottom="xxl">
			<Label>
				<span style={{ color: errors ? 'red' : '' }}>
					<span style={{ color: errors ? 'red' : '#4268F6' }}>{'* '}</span>
					{property.label}
				</span>
			</Label>
			<Select
				value={value}
				options={values}
				onChange={handleChange}
				placeholder="Выберите привязанного сотрудника"
			/>
			{errors && (
				<Label>
					<span style={{ color: 'red' }}>{errors?.message}</span>
				</Label>
			)}
		</Box>
	);
};

export default MultiSelectHead;
