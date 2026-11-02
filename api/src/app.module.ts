import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { TablesModule } from './modules/tables/tables.module.js';
import { VenueModule } from './modules/venue/venue.module.js';
import { PrismaModule } from './shared/prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    // Global storage for `ThrottlerGuard`; routes opt in with `@UseGuards(ThrottlerGuard)` + `@Throttle()`.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    AuthModule,
    VenueModule,
    TablesModule,
    CatalogModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
