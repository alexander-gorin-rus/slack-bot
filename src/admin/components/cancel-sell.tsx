import React, { useState, ChangeEvent, FC } from 'react';
import { useHistory } from 'react-router-dom';
import { ActionProps } from 'adminjs';
import { Modal, Box, Label, Input, Button, Header, colors, Text } from '@adminjs/design-system';
import { SellRequestStatus } from '../../database/util/sell-request-status.enum';

const NOT_AVAILABLE_STATUSES = [
	SellRequestStatus.CANCELLED_BY_ADMIN,
	SellRequestStatus.REJECTED_EMPLOYEE,
];

function canBeCancelled(vacationStatus) {
	const inNotAvailable = NOT_AVAILABLE_STATUSES.some((item) => item === vacationStatus);
	return !inNotAvailable;
}

const ModalCancelSell: FC<ActionProps> = (props) => {
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
			setError('Продажа уже отменена');
		} else if (text.length > 0) {
			setIsVisible(!isVisible);
		} else {
			setError('Поле не может быть пустым!');
		}
	};

	const submit = async () => {
		const response = await fetch('/api/rejectSell', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				...props.record.params,
				status: SellRequestStatus.CANCELLED_BY_ADMIN,
				cancelReason: text,
			}),
		});

		response
			.json()
			.then((res) => {
				if (res) {
					history.push('/resources/SellRequest');
				}
			})
			.catch((error) => setError(error.message));
	};

	return (
		<Box>
			<Label htmlFor="reasonCancel">* Введите причину отмены продажи</Label>
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
				<Modal onOverlayClick={toggleModal} onClose={toggleModal}>
					<Box>
						<Header textAlign="center">Отменить продажу?</Header>
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

export default ModalCancelSell;
