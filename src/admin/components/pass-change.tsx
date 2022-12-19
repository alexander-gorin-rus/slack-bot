import React from 'react'
import { Box } from '@adminjs/design-system';
import styled from 'styled-components'

const PassChange = () => {
  const CustomBox = styled(Box)`font-size: 1.5rem; padding: 2rem; color: #70c9b0; background-color: white; display: inline-block`
  return (
    <CustomBox>
      Пароль успешно изменен.
    </CustomBox>
  )
}

export default PassChange