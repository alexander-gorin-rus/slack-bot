import React from 'react'
import { Redirect } from 'react-router';

const RedirectEditTempaleEmail = (props) => {
  const url = `/resources/EmailTemplate/records/${props.record.params.id}/edit`;

  return (
    <Redirect to={ url } />
  )
}

export default RedirectEditTempaleEmail
