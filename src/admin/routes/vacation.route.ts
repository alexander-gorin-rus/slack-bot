import express, { Request, Response } from 'express';
import { env } from '../../configs/env';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { NodeMailerService } from '../../main/nodemailer.service';
import request from 'request';

const vacationRouter = express.Router();

interface IDayoffRequest extends Request {
	fields: VacationRequest;
}

interface IDayoffResponse extends Response {
	locals: NodeMailerService;
}

vacationRouter.get('/export-vacation', async (req: IDayoffRequest, res: IDayoffResponse, next) => {
	try {
		const options = {
			uri: `http://${env.API_ENDPOINT}/vacation/export`,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		};
		const result = await new Promise((resolve, reject) => {
			request(options, (err, res) => {
				if (err) reject(err);
				resolve(res);
			});
		});

		res.status(200).json(result);
		next();
	} catch (error) {
		throw new Error(error.messages);
	}
});

vacationRouter.post('/rejectVacation', async (req: IDayoffRequest, res: IDayoffResponse, next) => {
	try {
		const options = {
			uri: `http://${env.API_ENDPOINT}/vacation/rejectVacation`,
			method: 'POST',
			body: JSON.stringify(req.fields),
			headers: {
				'Content-Type': 'application/json',
			},
		};

		const result = await new Promise((resolve, reject) => {
			request(options, (err, res) => {
				if (err) reject(err);
				resolve(res);
			});
		});

		res.status(201).json(result);
		next();
	} catch (error) {
		throw new Error(error.messages);
	}
});

export default vacationRouter;
