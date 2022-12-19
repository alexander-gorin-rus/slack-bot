import React from 'react';
import { Redirect } from 'react-router';

const vacationDayChanges = (props) => {
  const url = `/resources/VacationDayChange?filters.employeeId=${props.record.params.id}&page=1`;
  return (
    <Redirect to={url} />
  );
};

export { vacationDayChanges };
export default vacationDayChanges;