import { SetMetadata } from '@nestjs/common';
import { OptionsClass } from './options.class';

export const Action = (name: string, options?: OptionsClass) =>
	SetMetadata('action', { name, options: options || new OptionsClass() });
