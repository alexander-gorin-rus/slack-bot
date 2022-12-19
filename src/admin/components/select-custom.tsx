import React, { FC, useEffect } from 'react';
import { BasePropertyProps } from 'adminjs';
import Select from 'react-select';
import { FormGroup, Label } from '@adminjs/design-system';

const SelectCustom: FC<BasePropertyProps> = (props) => {
	const handleChange = (selected) => {
		const { onChange, property } = props;
		onChange(property.path, selected.label);
	};

	const mapValue = (value: boolean): 'Да' | 'Нет' => {
		return value ? 'Да' : 'Нет';
	};

	const { property, record } = props;

	const value = record.params?.workingOff && record.params?.workingOff === 'Да' ? true : false;

	const options = [
		{ value: true, label: mapValue(true) },
		{ value: false, label: mapValue(false) },
	];

	const selected = options.find((o) => o.value === value);

	useEffect(() => {
		props.onChange(property.path, 'Нет');
	}, []);

	return (
		<FormGroup>
			<Label>{property.label}</Label>
			<Select value={selected} isClearable options={options} onChange={handleChange} />
		</FormGroup>
	);
};

export default SelectCustom;
