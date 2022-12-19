import React from 'react';
import { Redirect } from 'react-router';

const sellList = (props) => {
	const url = `/resources/SellRequest?filters.employeeId=${props.record.params.id}&page=1`;
	return (
		<Redirect to={url} />
	);
};

export { sellList };
export default sellList;