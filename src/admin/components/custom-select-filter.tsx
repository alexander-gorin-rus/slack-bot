import React, { ReactNode } from 'react';
import Select from 'react-select';
import { withTheme, DefaultTheme, ThemeProps } from 'styled-components';
import { FormGroup, Label, filterStyles } from '@adminjs/design-system';
import { FilterPropertyProps } from '../../../node_modules/adminjs/src/frontend/components/property-type/base-property-props';

class Filter extends React.PureComponent<FilterPropertyProps & ThemeProps<DefaultTheme>> {
	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
	}

	handleChange(selected): void {
		const { onChange, property } = this.props;
		const value = selected ? selected.value : '';
		onChange(property.path, value);
	}

	mapValue(value: boolean): 'Да' | 'Нет' | '' {
		if (typeof value === 'undefined') {
			return '';
		}
		return value ? 'Да' : 'Нет';
	}

	render(): ReactNode {
		const { property, filter = {}, theme } = this.props;
		const value = typeof filter[property.path] === 'undefined' ? '' : filter[property.path];
		const options = [
			{ value: true, label: this.mapValue(true) },
			{ value: false, label: this.mapValue(false) },
		];
		const selected = options.find((o) => o.value === value);

		return (
			<FormGroup>
				<Label>{property.label}</Label>
				<Select
					value={typeof selected === 'undefined' ? '' : selected}
					isClearable
					options={options}
					styles={filterStyles(theme)}
					onChange={this.handleChange}
					placeholder={'Выбрать'}
				/>
			</FormGroup>
		);
	}
}

export default withTheme(Filter as never);
