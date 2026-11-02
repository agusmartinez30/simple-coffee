import { Module, type Provider } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FindTableByNumber } from './application/find-table-by-number.js';
import { RegenerateTableQr, ResolveTableQr } from './application/qr.use-cases.js';
import { CreateSpace, DeleteSpace, MoveSpace, UpdateSpace } from './application/spaces.use-cases.js';
import { MoveTable, ResizeTable, SetTableShape } from './application/table-layout.use-cases.js';
import type { TablesDeps } from './application/tables-deps.js';
import { CreateTable, DeleteTable, GetTablesConfiguration, SetTableEnabled, UpdateTable } from './application/tables.use-cases.js';
import type { QrTokenGenerator, TableActivity, TablesRepository } from './domain/tables-configuration.js';
import { TableQrController, TablesConfigController } from './http/tables.controller.js';
import { PrismaTablesRepository } from './infrastructure/prisma-tables.repository.js';
import { CryptoQrTokenGenerator, NoTableActivity } from './infrastructure/table-adapters.js';
import { QR_TOKEN_GENERATOR, TABLE_ACTIVITY, TABLES_DEPS, TABLES_REPOSITORY } from './tables.tokens.js';

const useCaseProviders: Provider[] = [
  GetTablesConfiguration,
  CreateSpace,
  UpdateSpace,
  MoveSpace,
  DeleteSpace,
  CreateTable,
  UpdateTable,
  SetTableEnabled,
  DeleteTable,
  MoveTable,
  ResizeTable,
  SetTableShape,
  RegenerateTableQr,
  ResolveTableQr,
  FindTableByNumber,
].map((UseCase: new (deps: TablesDeps) => unknown) => ({
  provide: UseCase,
  useFactory: (deps: TablesDeps) => new UseCase(deps),
  inject: [TABLES_DEPS],
}));

@Module({
  // `SessionGuard` guards the admin routes.
  imports: [AuthModule],
  controllers: [TableQrController, TablesConfigController],
  providers: [
    { provide: TABLES_REPOSITORY, useClass: PrismaTablesRepository },
    { provide: TABLE_ACTIVITY, useClass: NoTableActivity },
    { provide: QR_TOKEN_GENERATOR, useClass: CryptoQrTokenGenerator },
    {
      provide: TABLES_DEPS,
      inject: [TABLES_REPOSITORY, TABLE_ACTIVITY, QR_TOKEN_GENERATOR],
      useFactory: (tables: TablesRepository, activity: TableActivity, tokens: QrTokenGenerator): TablesDeps => ({
        tables,
        activity,
        tokens,
        clock: { now: () => new Date() },
      }),
    },
    ...useCaseProviders,
  ],
  // The orders module checks and snapshots tables through this service.
  exports: [FindTableByNumber],
})
export class TablesModule {}
