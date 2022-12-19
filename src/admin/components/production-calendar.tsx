import React, { useState, useEffect } from 'react';
import CustomCalendar from './custom-calendar';
import { Redirect } from 'react-router';
import { ApiClient, useTranslation } from 'adminjs';
import { Button, Box, CheckBox, Label, Text } from '@adminjs/design-system';

const ProductionCalendar = (props) => {

  const apiClient = new ApiClient();
  const { translateButton } = useTranslation();
  const [active, setActive] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const [customWeekDays, setcustomWeekDays] = useState(() => {
    if (props?.record?.params?.nonWorkingDays) { 
      return JSON.parse(props.record.params.nonWorkingDays);
    } else {
      return definitionWeekEnds();
    }
  });

  useEffect(() => {
    setActive(props.record.params.active)
  }, [])

  function definitionWeekEnds () {
    const COUNT_MONTHS_IN_YEAR = 12;
    const YEAR = props.record.params.year;
    const weekDays = [];

    for (let numberMonth = 1; numberMonth <= COUNT_MONTHS_IN_YEAR; numberMonth++) {
      const countDaysInMonth = new Date(YEAR, numberMonth, 0).getDate();
      
      for (let day = 1; day <= countDaysInMonth; day++) {
        const nameOfDay = new Date(YEAR, numberMonth - 1, day).toLocaleDateString('ru-RU', { weekday: 'long' });
        
        if (nameOfDay === 'воскресенье' || nameOfDay === 'суббота') {
          const month = String(numberMonth).length === 1 ? ('0' + numberMonth).slice(-2) : numberMonth
          const dayWithZero = String(day).length === 1 ? ('0' + day).slice(-2) : day

          weekDays.push({
            'date': `${YEAR}-${month}-${dayWithZero}`,
            'status': 1
          })
        }
      }
    }

    return weekDays;
  }

  const makrkWeekDays = (weekDays) => {
    setcustomWeekDays(weekDays);
  }

  const saveWeekEnds = () => {
    apiClient.recordAction(
      {
        resourceId: 'ProductionCalendar',
        recordId: props.record.params.id,
        actionName: 'editCalendar',
        method: 'post', 
        data: {customWeekDays, active},
      }
    )
    .then((results) => {
      if (results.status === 200) {
        setRedirect(true)
      }
    })
  }

  return (
    <Box marginTop={'1.5rem'}>
      <Box 
        display={'flex'}
        justifyContent={'space-between'}
        width={'970px'}
        margin={'auto'} 
        paddingBottom={'2rem'}
      >
        <Box>
          <CheckBox checked={active}  onChange={() => setActive(!active)} id='active' />
          <Label inline htmlFor="active" ml="default">Настроен</Label>
        </Box>
        <Button 
          onClick={saveWeekEnds}
          variant={'primary'} 
        >
          {translateButton('save')}
        </Button> 
      </Box>

      <Box
        width={'970px'}
        margin={'auto'}
        marginBottom={'2rem'}
      >
        <Text>Чтобы указать выходной, сделайте один клик левой кнопкой мыши (оранжевое выделение).</Text>
        <Text>Чтобы указать праздник, сделайте два клика левой кнопкой мыши (зеленое выделение).</Text>
        <Text>Чтобы снять выделение, кликните на дату третий раз.</Text>
      </Box>

      <CustomCalendar
        year={props.record.params.year}
        days={customWeekDays}
        onChange={makrkWeekDays}
      />

      {redirect ? <Redirect to="/resources/ProductionCalendar" /> : null}
    </Box>
  );
};

export default ProductionCalendar;
