import { Injectable } from '@nestjs/common';
import { Messages } from '../main/messages.service';
import { HelperService } from '../main/helper.service';
import { EmailTpl } from '../main/email-tpl.decorator';
import { EmailSender } from '../main/email-message-option.interface';
import { VacationRequest } from '../database/entity/vacation-request.entity';
import { SellRequest } from '../database/entity/sell.entity';
import { NonWorkingDayType } from '../lib/interfaces/calendar.interface';
import { DayoffRequest } from '../database/entity/dayoff-request.entity';
import { messageFormat } from '../utils/messageFormat';

@Injectable()
export class EmailTemplatesService {
	@EmailTpl('vacationApproveForEmployee') vacationApproveForEmployee: EmailSender;
	@EmailTpl('vacationApproveForFinDep') vacationApproveForFinDep: EmailSender;
	@EmailTpl('sellDaysFinDep') sellDaysFinDep: EmailSender;
	@EmailTpl('sellDaysEmployee') sellDaysEmployee: EmailSender;
	@EmailTpl('signDocumentsForVacation') singDocumentsForVacation: EmailSender;
	@EmailTpl('sellVacationDaysAfterPlanning')
	sellVacationDaysAfterPlanning: EmailSender;
	@EmailTpl('SPvacationApproveForFinDep') SPvacationApproveForFinDep: EmailSender;
	@EmailTpl('SPvacationCancelForFinDep') SPvacationCancelForFinDep: EmailSender;
	@EmailTpl('vacationCancelForEmployee') vacationCancelForEmployee: EmailSender;
	@EmailTpl('vacationCancelForFinDep') vacationCancelForFinDep: EmailSender;
	@EmailTpl('vacationApproveUntilTwoWeekForFinDep')
	vacationApproveUntilTwoWeekForFinDep: EmailSender;
	@EmailTpl('sellCancelForFinDep') sellCancelForFinDep: EmailSender;
	@EmailTpl('sellCancelForEmployee') sellCancelForEmployee: EmailSender;
	@EmailTpl('vacationOneDayEmail') vacationOneDayEmail: EmailSender;
	@EmailTpl('dayoffOneDayEmail') dayoffOneDayEmail: EmailSender;
	@EmailTpl('dayoffCancelWithoutOK') dayoffCancelWithoutOk: EmailSender;
	@EmailTpl('dayoffCancelForFinDep') dayoffCancelForFinDep: EmailSender;
	@EmailTpl('dayoffCancelForEmployee') dayoffCancelForEmployee: EmailSender;

	constructor(private messages: Messages, private helper: HelperService) {}

	sendEmailVacationApproveForEmployee(emailList: string[], request: VacationRequest) {
		this.vacationApproveForEmployee(emailList, {
			request,
			from: this.messages('{from , date, long}', { from: request.from }),
			days: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
		});
	}

	sendEmailVacationApproveForFinDep(emailList: string[], request: VacationRequest, nonWorkingDays) {
		const emailBody = {
			request,
			from: this.messages('{from , date, long}', {
				from: this.helper.checkStartDate(
					request.from,
					nonWorkingDays.filter((el) => el.status !== NonWorkingDayType.WEEKEND)
				),
			}),
			days: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
		};

		if (request.employee.SPStatus) {
			this.SPvacationApproveForFinDep(emailList, emailBody);
		} else {
			this.vacationApproveForFinDep(emailList, emailBody);
		}
	}

	sendEmailSellVacationDaysAfterPlanning(
		emailList: string[],
		sellRequest: SellRequest,
		vacationRequest: VacationRequest,
		nonWorkingDays
	) {
		this.sellVacationDaysAfterPlanning(emailList, {
			request: sellRequest,
			from: this.messages('{from , date, long}', {
				from: this.helper.checkStartDate(
					vacationRequest.from,
					nonWorkingDays.filter((el) => el.status !== NonWorkingDayType.WEEKEND)
				),
			}),
			to: this.messages('{to , date, long}', {
				to: vacationRequest.to,
			}),
			days: this.messages(
				'{days} {days, plural, one {календарный день} few {календарных дня} many {календарных дней} other {}}',
				{ days: vacationRequest.days }
			),
			sellDays: this.messages(
				'{days} {days, plural, one {отпускного дня} few {отпускных дней} many {отпускным дням} other {}}',
				{ days: sellRequest.days }
			),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: vacationRequest.days,
			}),
			sellFrom: this.messages('{from , date, long}', {
				from: sellRequest.from,
			}),
			sellTo: this.messages('{to , date, long}', { to: sellRequest.to }),
		});
	}

	sendEmailSellDaysFinDep(emailList: string[], request: SellRequest) {
		this.sellDaysFinDep(emailList, {
			request: request,
			from: this.messages('{from , date, long}', {
				from: request.from,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			days: this.messages(
				'{days} {days, plural, one {календарный день} few {календарных дня} many {календарных дней} other {}}',
				{ days: request.days }
			),
		});
	}

	sendEmailSellDaysEmployee(request: SellRequest) {
		this.sellDaysEmployee(request.employee.email, {
			request: request,
			from: this.messages('{from , date, long}', {
				from: request.from,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			days: this.messages(
				'{days} {days, plural, one {календарный день} few {календарных дня} many {календарных дней} other {}}',
				{ days: request.days }
			),
		});
	}

	sendEmailSignDocumentsForVacation(request: VacationRequest) {
		this.singDocumentsForVacation(request.employee.email, {
			request,
			from: this.messages('{from}', {
				from: this.helper.mailDateFormatFromDefault({
					date: request.from,
				}),
			}),
			to: this.messages('{to}', {
				to: this.helper.mailDateFormatFromDefault({
					date: request.to,
				}),
			}),
			days: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
		});
	}

	sendEmailVacationCancelForFinDep(emailList: string[], request: VacationRequest) {
		const body = {
			request,
			from: this.messages('{from , date, long}', { from: request.from }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
		};

		if (request.employee.SPStatus) {
			this.SPvacationCancelForFinDep(emailList, body);
		} else {
			this.vacationCancelForFinDep(emailList, body);
		}
	}

	sendEmailVacationCancelForEmployee(emailList: string[], request: VacationRequest) {
		this.vacationCancelForEmployee(emailList, {
			request,
			from: this.messages('{from , date, long}', { from: request.from }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
		});
	}

	sendEmailSellCancelForFinDep(emailList: string[], request: SellRequest) {
		this.sellCancelForFinDep(emailList, {
			request: request,
			from: this.messages('{from , date, long}', {
				from: request.from,
			}),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
		});
	}

	sendEmailSellCancelForEmployee(emailList: string[], request: SellRequest) {
		this.sellCancelForEmployee(emailList, {
			request: request,
			from: this.messages('{from , date, long}', {
				from: request.from,
			}),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
		});
	}

	sendEmailVacationApproveUntilTwoWeekForFinDep(emailList: string[], request: VacationRequest) {
		this.vacationApproveUntilTwoWeekForFinDep(emailList, {
			request,
			from: this.messages('{from , date, long}', { from: request.from }),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
		});
	}

	sendEmailVacationOneDay(email: string, request: VacationRequest) {
		this.vacationOneDayEmail(email, {
			request,
			from: this.messages('{from , date, long}', {
				from: request.from,
			}),
			to: this.messages('{to, date, long}', { to: request.to }),
			days: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
		});
	}

	sendEmailDayoffOneDay(email: string, request: DayoffRequest) {
		this.dayoffOneDayEmail(email, {
			request,
			from: this.messages('{from , date, long}', {
				from: request.from,
			}),
			shortDays: this.messages('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: this.messages('{to , date, long}', { to: request.to }),
		});
	}

	sendEmailDayfoffCancelForFinDep(emails: string[], request: DayoffRequest) {
		this.dayoffCancelForFinDep(emails, {
			request,
			from: messageFormat('{from , date, long}', { from: request.from }),
			shortDays: messageFormat('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: messageFormat('{to , date, long}', { to: request.to }),
		});
	}

	sendEmailDayfoffCancelForEmployeeFromAdmin(emails: string[], request: DayoffRequest) {
		this.dayoffCancelWithoutOk(emails, {
			request,
			from: messageFormat('{from , date, long}', { from: request.from }),
			shortDays: messageFormat('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: messageFormat('{to , date, long}', { to: request.to }),
		});
	}

	sendEmailDayoffCancelForEmployee(emails: string[], request: DayoffRequest) {
		this.dayoffCancelForEmployee(emails, 'dayoffCancelForEmployee', {
			request,
			from: messageFormat('{from , date, long}', { from: request.from }),
			shortDays: messageFormat('{days} {days, plural, one {день} few {дня} many {дней} other {}}', {
				days: request.days,
			}),
			to: messageFormat('{to , date, long}', { to: request.to }),
		});
	}
}
