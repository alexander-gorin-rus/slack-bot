import { Test, TestingModule } from '@nestjs/testing';
import { SellRequest } from '../../database/entity/sell.entity';
import { VacationRequest } from '../../database/entity/vacation-request.entity';
import { Messages } from '../../main/messages.service';
import { messageFormat } from '../../utils';
import { VacationPlanService } from './vacation-plan.service';

describe('VacationPlanService', () => {
	let service: VacationPlanService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				VacationPlanService,
				{ provide: Messages, useValue: (text: string, data: any) => messageFormat(text, data) },
			],
		}).compile();

		service = module.get<VacationPlanService>(VacationPlanService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	const sellList = [
		undefined,
		{ days: 2, from: new Date('2022-10-08'), to: new Date('2022-10-10') } as SellRequest,
	];
	sellList.forEach((sellValue) =>
		it(`plannedMessage: sell: ${JSON.stringify(sellValue)}`, () => {
			const channel = 'dummy';
			const result = service.plannedMessage(
				channel,
				{ days: 5, from: new Date('2022-10-10'), to: new Date('2022-10-12') } as VacationRequest,
				sellValue
			);
			const checkText =
				'Я отправил запрос на планирование отпуска на 5 дней c 10 октября 2022 г. по 12 октября 2022 г.';
			expect(result.channel).toEqual(channel);
			expect(result.text).toEqual('Планирование отпуска');
			const isTextPresent = result.blocks.some(
				(block) => block.type === 'section' && block.text.text === checkText
			);
			expect(isTextPresent).toBeTruthy();

			if (sellValue) {
				const sellText =
					'Отпуску сопутствует продажа на 2 дня c 8 октября 2022 г. по 10 октября 2022 г.\n Запрос на продажу будет отправлен после подтверждения отпуска руководителем.';
				const isSellTextPresent = result.blocks.some(
					(block) => block.type === 'section' && block.text.text === sellText
				);
				expect(isSellTextPresent).toBeTruthy();
			}
		})
	);
});
