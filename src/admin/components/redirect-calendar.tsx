import React from 'react'
import { Redirect } from 'react-router';

const RedirectCalendar = (props) => {
  const url = `/resources/ProductionCalendar/records/${props.record.params.id}/editCalendar`;

  return (
    <Redirect to={ url } />
  )
}

export default RedirectCalendar
