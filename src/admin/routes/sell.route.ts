import express, { Request, Response } from 'express';
import { env } from '../../configs/env';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { NodeMailerService } from '../../main/nodemailer.service';
import request from 'request';

const sellRouter = express.Router();

interface IDayoffRequest extends Request {
	fields: VacationRequest;
}

interface IDayoffResponse extends Response {
	locals: NodeMailerService;
}

sellRouter.get('/export-sell', async (req: IDayoffRequest, res: IDayoffResponse, next) => {
	try {
		const options = {
			uri: `http://${env.API_ENDPOINT}/sell/export`,
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

sellRouter.post('/rejectSell', async (req: IDayoffRequest, res: IDayoffResponse, next) => {
	try {
		const options = {
			uri: `http://${env.API_ENDPOINT}/sell/rejectSellRequest`,
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

export default sellRouter;
