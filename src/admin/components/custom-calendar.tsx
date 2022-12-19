import React, { useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import { InputGroup } from '@adminjs/design-system/src/molecules/form-group/index';
import styles from '@adminjs/design-system/src/utils/datepicker.styles';
import { Input } from '@adminjs/design-system/src/atoms/input';
import { Button } from '@adminjs/design-system/src/atoms/button/index';
import { cssClass } from '@adminjs/design-system/src/utils/css-class';
import styled from 'styled-components';
import ru from 'date-fns/locale/ru';

const StyledDatePicker = styled(InputGroup)`
  ${styles};
  position: relative;

  &.active ${Input}, &.active ${Button} {
    z-index: 101;
  }

  & .react-datepicker {
    border-radius: 0;
    border: 1px solid ${({ theme }): string => theme.colors.primary100};
    padding: ${({ theme }): string => theme.space.default};
    font-family: ${({ theme }): string => theme.font};
    z-index: 101;
  }

  & .react-datepicker__navigation--next {
    border-left-color: ${({ theme }): string => theme.colors.primary60};
    top: 16px;
  }

  & .react-datepicker__navigation--next:hover {
    border-left-color: ${({ theme }): string => theme.colors.primary100};
  }

  & .react-datepicker__navigation--previous {
    border-right-color: ${({ theme }): string => theme.colors.primary60};
    top: 16px;
  }

  & .react-datepicker__navigation--previous:hover {
    border-right-color: ${({ theme }): string => theme.colors.primary100};
  }

  & .react-datepicker__navigation {
    outline: none;
  }

  & .react-datepicker__year-read-view--down-arrow {
    top: 5px;
  }

  & .react-datepicker__header {
    background: ${({ theme }): string => theme.colors.white};
    font-size: ${({ theme }): string => theme.fontSizes.default};
    border: none;
  }

  & .react-datepicker__current-month {
    font-weight: normal;
    padding-bottom: ${({ theme }): string => theme.space.lg};
  }

  & .react-datepicker__month {
    margin-top: 0;
  }

  & .react-datepicker__day-name {
    color: ${({ theme }): string => theme.colors.primary60};
  }

  & .react-datepicker__day--outside-month {
    color: ${({ theme }): string => theme.colors.grey40};
  }

  & .react-datepicker__day--today.react-datepicker__day--keyboard-selected {
    color: ${({ theme }): string => theme.colors.white};
  }

  & .react-datepicker__day--selected {
    color: ${({ theme }): string => theme.colors.white};
  }

  & .react-datepicker__day--keyboard-selected:not(.react-datepicker__day--today) {
    background: none;
    color: ${({ theme }): string => theme.colors.grey100};
  }

  & .react-datepicker__day:hover,
  & .react-datepicker__day {
    border-radius: 15px;
  }

  & .react-datepicker__day--selected {
    background: ${({ theme }): string => theme.colors.primary100};
    border-radius: 15px;
    color: ${({ theme }): string => theme.colors.white};
  }

  & .react-datepicker__month-container {
    width: 240px;
    height: 280px;
  }

  & .react-datepicker {
    width: 960px;
  }

  & .react-datepicker__navigation {
    display: none;
  }

  & .react-datepicker__day--selected,
  & .react-datepicker__day--keyboard-selected {
    background: none;
    border-radius: 15px;
    color: #fff;
  }

  & .react-datepicker__day--highlighted-custom-1,
  & .react-datepicker__day--highlighted-custom-1.react-datepicker__day--selected,
  & .react-datepicker__day--highlighted-custom-1.react-datepicker__day--keyboard-selected {
    background: #f69c42;
    border-radius: 15px;
    color: #fff;
  }

  & .react-datepicker__day--highlighted-custom-2,
  & .react-datepicker__day--highlighted-custom-2.react-datepicker__day--selected,
  & .react-datepicker__day--highlighted-custom-2.react-datepicker__day--keyboard-selected {
    background: #008a0b;
    border-radius: 15px;
    color: #fff;
  }
`;


const getDaysByStatus = (days, status) => {
  const filter = days.filter(item => item.status === status).map(item => item.date);
  return filter;
};

const isLeapYear = (date) => {
  const year = date.getFullYear();
  if ((year & 3) != 0) return false;
  return ((year % 100) != 0 || (year % 400) == 0);
};

// Get Day of Year
const getDOY = (date) => {
  const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const mn = date.getMonth();
  const dn = date.getDate();
  let dayOfYear = dayCount[mn] + dn;

  if (mn > 1 && isLeapYear(date)) {
    dayOfYear++;
  }
  return dayOfYear;
};

const CustomCalendar = (props) => {
  const [days, setDays] = useState(
    (props.days || []).map(item => {
      return { 
        status: item.status, 
        date: new Date(item.date) 
      };
    })
  );
  const tap = (days, date) => {
    const day = days.filter((day) => getDOY(day.date) === getDOY(date))[0];
    if (day) {
      day.status++;
      if (day.status > 2) {
        day.status = 0;
      }
    } else {
      days.push({ date: date, status: 1 });
    }

    if (props.onChange) {
      props.onChange(days.map(item => {
        return {
          status: item.status,
          date: item.date.getFullYear() + '-' + (item.date.getMonth() + 1).toString().padStart(2,'0') + '-' + item.date.getDate().toString().padStart(2,'0')
        };
      }).filter(item => item.status));
    }
    return days;
  };

  const highlightWithRanges = [
    {
      'react-datepicker__day--highlighted-custom-1': getDaysByStatus(days, 1)
    },
    {
      'react-datepicker__day--highlighted-custom-2': getDaysByStatus(days, 2)
    }
  ];


  return (
    <>
      <StyledDatePicker className={cssClass('DatePicker', 'active')}>
        <ReactDatePicker
          selected={new Date(props.year + '-01-01')}
          onChange={(date) => {
            setDays([...tap(days, date)]);
          }}
          monthsShown={12}
          maxDate={new Date(props.year + '-12-31')}
          minDate={new Date(props.year + '-01-01')}
          inline
          showDisabledMonthNavigation
          highlightDates={highlightWithRanges}
          locale={ru}
        />
      </StyledDatePicker>
    </>
  );
};

export default CustomCalendar;
