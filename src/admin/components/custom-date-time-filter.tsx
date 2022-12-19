import React, { useState, useEffect } from 'react'
import { Label, Box } from '@adminjs/design-system'
import { BasePropertyProps } from 'adminjs';
import styled from 'styled-components';

const CustomDatePicker: React.FC<BasePropertyProps> = ({ property, filter, onChange, record }) => {
  const [valueInput, setValueInput] = useState('')
  const [ errors, setErrors ] = useState(null)

  useEffect(() => {
    record?.params[property?.path] && setValueInput(String(record?.params[property?.path]))
  }, [])

  const handleChange = (path, value) => {
    setValueInput(value)
    onChange(path, value)
  }

  useEffect(() => {
    if(record?.errors[property?.path] !== undefined){
      setErrors(record?.errors[property?.path])
    } else {
      setErrors(null)
    }
  }, [record])

  return (
    <StyledDatePicker>
      <Box marginBottom="xxl">
        
        <Label>
            <span className={errors ? 'error' : ''}><span className={errors ? 'error' : 'default__required'}>{'* '}</span>{property.label}</span>
        </Label>  
        <input 
          onChange={(e) => handleChange(property.path, e.target.value)} 
          value={valueInput} 
          className='date__input'
          type='date' 
        />
        {errors && 
          <Label>
            <span className='error'>{errors?.message}</span>
          </Label>
        }
      </Box>
    </StyledDatePicker>
  )
}

const StyledDatePicker = styled('div')`
  position: relative;
  & .default__required {
    color: #4268F6;
  }

  & .date__input {
    font-family: 'Roboto',sans-serif;
    border-style: solid;
    border-width: 1px;
    border-radius: 4px;
    border-color: hsl(0,0%,80%); 
    height: 34px; 
    width: calc(100% - 18px); 
    padding: 0 10px 0 5px;
  }

  & .error {
    color: red;
  }
`;

export default CustomDatePicker
