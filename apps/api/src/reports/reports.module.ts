import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { DashboardsController } from './dashboards.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController, DashboardsController],
  providers: [ReportsService],
})
export class ReportsModule {}
