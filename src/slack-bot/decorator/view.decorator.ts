import { SetMetadata } from '@nestjs/common';
import { OptionsClass } from './options.class';

export const View = (name: string, options?: OptionsClass) =>
	SetMetadata('view', { name, options: options || new OptionsClass() });
