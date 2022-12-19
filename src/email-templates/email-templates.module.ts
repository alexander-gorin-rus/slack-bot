import { Module } from '@nestjs/common';
import { MainModule } from '../main/main.module';
import { EmailTemplatesService } from './email-templates.service';

@Module({
	imports: [MainModule],
	providers: [EmailTemplatesService],
	exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
