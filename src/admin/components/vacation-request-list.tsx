import React from 'react';
import { Redirect } from 'react-router';

const vacationRequestList = (props) => {
  const url = `/resources/VacationRequest?filters.employeeId=${props.record.params.id}&page=1`;
  return (
    <Redirect to={url} />
  );
};

export { vacationRequestList };
export default vacationRequestList;