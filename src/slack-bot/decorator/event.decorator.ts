import { SetMetadata } from '@nestjs/common';
import { OptionsClass } from './options.class';

export const Event = (name: string, options?: OptionsClass) =>
	SetMetadata('event', { name, options: options || new OptionsClass() });
