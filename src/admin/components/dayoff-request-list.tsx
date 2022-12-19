import React from 'react';
import { Redirect } from 'react-router';

const dayoffRequestList = (props) => {
  const url = `/resources/DayoffRequest?filters.employeeId=${props.record.params.id}&page=1`;
  return (
    <Redirect to={url} />
  );
};

export { dayoffRequestList };
export default dayoffRequestList;