import React, { useState, ChangeEvent, FC } from 'react';
import { useHistory } from 'react-router-dom';
import { ActionProps } from 'adminjs';
import { Modal, Box, Label, Input, Button, Header, colors, Text } from '@adminjs/design-system';
import { VacationRequestStatus } from '../../database/util/vacation-request-status.enum';

const NOT_AVAILABLE_STATUSES = [
	VacationRequestStatus.AUTO_REJECT,
	VacationRequestStatus.CANCELLED_BY_ADMIN,
	VacationRequestStatus.REJECTED_EMPLOYEE,
	VacationRequestStatus.REJECTED_HEAD,
	VacationRequestStatus.REJECTED_PM,
];

function canBeCancelled(vacationStatus) {
	const inNotAvailable = NOT_AVAILABLE_STATUSES.some((item) => item === vacationStatus);
	return !inNotAvailable;
}

const CancelVacation: FC<ActionProps> = (props) => {
	const history = useHistory();
	const [isVisible, setIsVisible] = useState(false);
	const [text, setText] = useState('');
	const [error, setError] = useState('');

	const onChange = (e: ChangeEvent<HTMLInputElement>) => {
		setError('');
		setText(e.target.value);
	};

	const toggleModal = () => {
		if (!canBeCancelled(props.record.params.status)) {
			setError('Отпуск уже отменен');
		} else if (text.length > 0) {
			setIsVisible(!isVisible);
		} else {
			setError('Поле не может быть пустым!');
		}
	};

	const submit = async () => {
		const response = await fetch('/api/rejectVacation', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				...props.record.params,
				status: VacationRequestStatus.CANCELLED_BY_ADMIN,
				cancelReason: text,
			}),
		});

		response
			.json()
			.then((res) => {
				if (res) {
					history.push('/resources/VacationRequest');
				}
			})
			.catch((error) => setError(error.message));
	};

	return (
		<Box>
			<Label htmlFor="reasonCancel">* Введите причину отмены отпуска</Label>
			<Input
				width="100%"
				id="reasonCancel"
				style={{
					borderColor: error.length ? colors.error : undefined,
				}}
				value={text}
				onChange={onChange}
			/>
			<Text color={colors.error} style={{ height: '1.5rem' }}>
				{error}
			</Text>
			<Button h mt="0.5rem" onClick={toggleModal}>
				Сохранить
			</Button>
			{isVisible && (
				// @ts-ignore
				<Modal onOverlayClick={toggleModal} onClose={toggleModal}>
					<Box>
						<Header textAlign="center">Отменить отпуск?</Header>
						<Box flex justifyContent="center">
							<Button variant="primary" ml="1rem" onClick={submit}>
								Да
							</Button>
							<Button variant="danger" mr="1rem" onClick={toggleModal}>
								Нет
							</Button>
						</Box>
					</Box>
				</Modal>
			)}
		</Box>
	);
};

export default CancelVacation;
