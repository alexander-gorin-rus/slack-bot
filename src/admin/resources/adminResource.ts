import AdminJS, { ResourceOptions, ValidationError } from 'adminjs';
import { hash } from 'argon2';
import { AdminValidator } from '../admin.validator';
import { makePassword } from '../utils';
import { Admin } from '../../database/entity/admin.entity';
import { NodeMailerService } from '../../main/nodemailer.service';
import { AdminService } from '../../database/service/admin.service';

function isSuperAdmin(admin: { id?: string | number }) {
	return !!admin && Number(admin?.id) === 1;
}

const initAdminResource = (
	mailer: NodeMailerService,
	adminService: AdminService
): ResourceOptions => {
	return {
		parent: {
			name: 'Настройки панели',
			icon: 'Gear',
		},
		filterProperties: ['name', 'email', 'active'],
		properties: {
			id: {
				isVisible: false,
			},
			name: {
				position: 2,
				isRequired: true,
			},
			email: {
				position: 3,
				isRequired: true,
			},
			password: {
				isVisible: false,
			},
			employeeId: {
				isVisible: true,
				position: 4,
			},
			active: {
				isVisible: {
					show: false,
					edit: true,
				},
				components: {
					filter: AdminJS.bundle('../components/custom-select-filter.tsx'),
				},
			},
		},
		actions: {
			delete: {
				isAccessible: ({ currentAdmin, record }) => {
					if (!currentAdmin.id || !record.param('id')) {
						return false;
					}
					const isSameId = Number(record.param('id')) === Number(currentAdmin.id);
					if (isSameId) return false;
					if (isSuperAdmin(currentAdmin)) return true;
					return false;
				},
			},
			changePassword: {
				actionType: 'record',
				icon: 'Password',
				isAccessible: ({ currentAdmin, record }) => {
					if (isSuperAdmin(currentAdmin)) {
						return true;
					}
					if (currentAdmin.id === record.param('id')) {
						return true;
					}
				},
				isVisible: true,
				handler: async (request, response, context) => {
					const password = makePassword(8);
					const passwordHash = await hash(password);

					await adminService.changePassword(context.record.params.id, passwordHash);
					await mailer.sendMessage({
						to: context.record.params.email,
						subject: 'Change Password',
						html: `Changed password: ${password}`,
					});

					return {
						record: context.record.toJSON(context.currentAdmin),
					};
				},
				component: AdminJS.bundle('../components/pass-change.tsx'),
			},
			new: {
				isAccessible: ({ currentAdmin }) => isSuperAdmin(currentAdmin),
				before: async (request) => {
					const password = makePassword(8);
					const passwordHash = await hash(password);
					request.payload = {
						...request.payload,
						password: passwordHash,
						active: request.payload.active || false,
					};

					await mailer.sendMessage({
						to: request.payload.email,
						subject: 'New Password',
						html: `New password: ${password}`,
					});

					if (request.method === 'post') {
						const requiredFields = [
							AdminValidator.requiredField('name'),
							AdminValidator.requiredField('email'),
						];
						AdminValidator.invoker(request, requiredFields);
					}

					return request;
				},
			},
			edit: {
				isAccessible: ({ currentAdmin }) => isSuperAdmin(currentAdmin),
				actionType: 'record',
				// eslint-disable-next-line require-await
				before: async (request) => {
					if (request.method === 'post') {
						const requiredFields = [
							AdminValidator.requiredField('name'),
							AdminValidator.requiredField('email'),
							async (request) => {
								const email = request.payload['email'].trim();
								const id = request.payload['id'];
								const exists = await adminService.isEmailRegistered(id, email);
								if (exists)
									throw new ValidationError({ email: { message: 'Этот email уже используется' } });
							},
							async (request) => {
								const name = request.payload['name'].trim();
								const id = request.payload['id'];
								const exists = await adminService.isNameRegistered(id, name);
								if (exists)
									throw new ValidationError({ name: { message: 'Это имя уже используется' } });
							},
						];
						await AdminValidator.invoker(request, requiredFields);
					}
					return request;
				},
			},
		},
	};
};

export const AdminResource = (mailer: NodeMailerService, adminService: AdminService) => ({
	resource: Admin,
	options: initAdminResource(mailer, adminService),
});
