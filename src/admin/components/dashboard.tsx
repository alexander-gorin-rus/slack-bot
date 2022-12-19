import React from 'react'
import { Redirect } from 'react-router';

const Dashboard = () => {
  const url = '/resources/Employee';
  
  return (
    <Redirect to={ url } />
  )
}

export default Dashboard