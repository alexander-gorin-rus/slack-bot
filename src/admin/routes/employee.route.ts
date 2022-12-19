import express, { Request, Response } from 'express';
import { env } from '../../configs/env';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { NodeMailerService } from '../../main/nodemailer.service';
import request from 'request';

const employeeRouter = express.Router();

interface IDayoffRequest extends Request {
	fields: VacationRequest;
}

interface IDayoffResponse extends Response {
	locals: NodeMailerService;
}

employeeRouter.get('/employees', async (req: IDayoffRequest, res: IDayoffResponse, next) => {
	try {
		const options = {
			uri: `http://${env.API_ENDPOINT}/employees/getEmployees`,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		};

		const response: any = await new Promise((resolve, reject) => {
			request(options, (err, res) => {
				if (err) reject(err);
				resolve(res);
			});
		});

		const result = JSON.parse(response.body);
		res.status(201).json(result);
		next();
	} catch (error) {
		throw Error(error);
	}
});

employeeRouter.get('/pm-employees', async (req: IDayoffRequest, res: IDayoffResponse, next) => {
	try {
		const options = {
			uri: `http://${env.API_ENDPOINT}/employees/getPMEmployees`,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		};

		const response: any = await new Promise((resolve, reject) => {
			request(options, (err, res) => {
				if (err) reject(err);
				resolve(res);
			});
		});

		const result = JSON.parse(response.body);
		res.status(201).json(result);
		next();
	} catch (error) {
		throw Error(error);
	}
});

export default employeeRouter;
