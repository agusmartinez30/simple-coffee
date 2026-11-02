import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import {
  AUTH_CONFIG,
  MAILER,
  PASSWORD_HASHER,
  PASSWORD_RESET_TOKEN_REPOSITORY,
  SESSION_REPOSITORY,
  STAFF_USER_REPOSITORY,
} from '../src/modules/auth/auth.tokens.js';
import { CATALOG_REPOSITORY } from '../src/modules/catalog/catalog.tokens.js';
import { ORDERS_CLOCK, ORDERS_REPOSITORY } from '../src/modules/orders/orders.tokens.js';
import { TABLES_REPOSITORY } from '../src/modules/tables/tables.tokens.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createAuthDeps, staffUser, STRONG_PASSWORD } from './support/in-memory-auth.js';
import { createOrdersDeps, ORDERS_NOW, ordersCatalogFixture } from './support/in-memory-orders.js';
import { tablesConfiguration } from './support/in-memory-tables.js';

type OrderBody = { id: string; number: number; status: string; total: number; events: { kind: string }[] };

describe('orders HTTP (e2e)', () => {
  let app: INestApplication<Server>;
  /** Signed in once: login is rate limited. */
  let agent: ReturnType<typeof request.agent>;
  const auth = createAuthDeps();
  const orders = createOrdersDeps();
  const staff = staffUser({ role: 'STAFF' });

  beforeAll(async () => {
    auth.users.add(staff);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(AUTH_CONFIG)
      .useValue({ ...auth.config, secureCookies: false })
      .overrideProvider(STAFF_USER_REPOSITORY)
      .useValue(auth.users)
      .overrideProvider(SESSION_REPOSITORY)
      .useValue(auth.sessions)
      .overrideProvider(PASSWORD_RESET_TOKEN_REPOSITORY)
      .useValue(auth.resetTokens)
      .overrideProvider(PASSWORD_HASHER)
      .useValue(auth.hasher)
      .overrideProvider(MAILER)
      .useValue(auth.mailer)
      .overrideProvider(CATALOG_REPOSITORY)
      .useValue(orders.catalog)
      .overrideProvider(TABLES_REPOSITORY)
      .useValue(orders.venueTables)
      .overrideProvider(ORDERS_REPOSITORY)
      .useValue(orders.orders)
      .overrideProvider(ORDERS_CLOCK)
      .useValue(orders.clock)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app, []);
    await app.init();
    agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email: 'turno@cafecentral.com', password: STRONG_PASSWORD }).expect(200);
  });

  beforeEach(() => {
    orders.catalog.reset(ordersCatalogFixture());
    orders.venueTables.reset(tablesConfiguration());
    orders.orders.reset();
    orders.clock.current = new Date(ORDERS_NOW);
  });

  afterAll(async () => {
    await app.close();
  });

  const place = (body: object) => agent.post('/orders').send({ tableNumber: 2, lines: [{ productId: 'prod_latte', quantity: 1 }], ...body });

  it('requires a session', async () => {
    const server = app.getHttpServer();
    await request(server).get('/orders').expect(401);
    await request(server).post('/orders').send({ tableNumber: 1, lines: [] }).expect(401);
    await request(server).get('/orders/ord_1').expect(401);
    await request(server).post('/orders/ord_1/advance').expect(401);
    await request(server).post('/orders/ord_1/cancel').send({ reason: 'order_error' }).expect(401);
  });

  it('creates an order priced from the catalog, with defaults and options', async () => {
    const created = await place({
      customerName: ' Lucía ',
      note: 'Sin apuro',
      lines: [
        { productId: 'prod_latte', quantity: 2, note: 'Bien caliente' },
        { productId: 'prod_toast', quantity: 1, optionIds: ['opt_seeds', 'opt_avocado'] },
      ],
    }).expect(201);
    expect(created.body).toEqual({
      id: 'ord_1',
      number: 1001,
      tableNumber: 2,
      tableLabel: 'Mesa 02',
      spaceName: 'Salón',
      customerName: 'Lucía',
      note: 'Sin apuro',
      status: 'received',
      cancellationReason: null,
      source: 'staff',
      createdBy: { id: staff.id, name: staff.name },
      total: 2 * 4200 + 6500,
      items: [
        {
          id: 'ord_1_item_1',
          productId: 'prod_latte',
          productName: 'Latte',
          sku: 'CAF-001',
          quantity: 2,
          unitPrice: 4200,
          subtotal: 8400,
          note: 'Bien caliente',
          options: [{ groupTitle: 'Leche', optionName: 'Entera', priceDelta: 0 }],
        },
        {
          id: 'ord_1_item_2',
          productId: 'prod_toast',
          productName: 'Tostado',
          sku: 'CAF-003',
          quantity: 1,
          unitPrice: 6500,
          subtotal: 6500,
          note: null,
          options: [
            { groupTitle: 'Pan', optionName: 'Semillas', priceDelta: 300 },
            { groupTitle: 'Extras', optionName: 'Palta', priceDelta: 1200 },
          ],
        },
      ],
      events: [{ kind: 'received', at: ORDERS_NOW.toISOString(), actor: { id: staff.id, name: staff.name } }],
      createdAt: ORDERS_NOW.toISOString(),
      updatedAt: ORDERS_NOW.toISOString(),
    });
    const fetched = await agent.get('/orders/ord_1').expect(200);
    expect(fetched.body).toEqual(created.body);
    await agent.get('/orders/nope').expect(404, { statusCode: 404, error: 'order_not_found', message: 'Order not found' });
  });

  it('refuses products that cannot be ordered and bad options', async () => {
    const unavailable = await place({ lines: [{ productId: 'prod_lemonade', quantity: 1 }] }).expect(409);
    expect(unavailable.body).toMatchObject({ error: 'product_not_orderable', productId: 'prod_lemonade', reason: 'unavailable' });
    const draft = await place({ lines: [{ productId: 'prod_tea', quantity: 1 }] }).expect(409);
    expect(draft.body).toMatchObject({ productId: 'prod_tea', reason: 'draft' });

    const invalid = await place({
      lines: [
        { productId: 'prod_toast', quantity: 1 },
        { productId: 'prod_latte', quantity: 1, optionIds: ['opt_avocado'] },
        { productId: 'prod_toast', quantity: 1, optionIds: ['opt_white', 'opt_avocado', 'opt_egg', 'opt_cheese'], note: 'Sin sal' },
      ],
    }).expect(400);
    expect(invalid.body).toMatchObject({
      error: 'invalid_order',
      issues: [
        { path: 'lines.0.optionIds', code: 'missing_required_group', groupId: 'grp_bread' },
        { path: 'lines.1.optionIds.0', code: 'unknown_option' },
        { path: 'lines.2.optionIds', code: 'too_many_options', groupId: 'grp_extras' },
        { path: 'lines.2.note', code: 'not_allowed' },
      ],
    });
    await place({ lines: [{ productId: 'prod_latte', quantity: 0 }] }).expect(400);
    await place({ lines: [] }).expect(400);
    await place({ lines: 'latte' }).expect(400);
    expect(orders.orders.orders).toEqual([]);
  });

  it('refuses unknown and disabled tables', async () => {
    const unknown = await place({ tableNumber: 42 }).expect(400);
    expect(unknown.body).toMatchObject({ issues: [{ path: 'tableNumber', code: 'unknown_table' }] });
    await agent.post('/tables/tbl_03/disable').expect(200);
    const disabled = await place({ tableNumber: 3 }).expect(409);
    expect(disabled.body).toMatchObject({ error: 'table_disabled', tableNumber: 3 });
  });

  it('lists the orders of a service day in the venue time zone', async () => {
    orders.clock.current = new Date('2026-11-01T02:59:59Z'); // 23:59:59 on Oct 31 in Buenos Aires
    const lastNight = (await place({}).expect(201)).body as OrderBody;
    orders.clock.current = new Date('2026-11-01T03:00:00Z'); // midnight on Nov 1
    const midnight = (await place({}).expect(201)).body as OrderBody;
    orders.clock.current = new Date(ORDERS_NOW);
    const noon = (await place({}).expect(201)).body as OrderBody;
    await agent.post(`/orders/${noon.id}/advance`).expect(200);

    const numbers = (response: { body: unknown }) => (response.body as OrderBody[]).map((order) => order.number);
    expect(numbers(await agent.get('/orders').expect(200))).toEqual([midnight.number, noon.number]);
    expect(numbers(await agent.get('/orders').query({ date: '2026-10-31' }).expect(200))).toEqual([lastNight.number]);
    expect(numbers(await agent.get('/orders').query({ date: '2026-11-01', status: 'preparing' }).expect(200))).toEqual([noon.number]);
    await agent.get('/orders').query({ date: '2026-02-30' }).expect(400);
    await agent.get('/orders').query({ status: 'RECEIVED' }).expect(400);
  });

  it('advances through to delivered, then refuses to move on', async () => {
    const { id } = (await place({}).expect(201)).body as OrderBody;
    orders.clock.advance(60_000);
    const preparing = await agent.post(`/orders/${id}/advance`).expect(200);
    expect(preparing.body).toMatchObject({ status: 'preparing', updatedAt: orders.clock.now().toISOString() });
    const delivered = await agent.post(`/orders/${id}/advance`).expect(200);
    expect((delivered.body as OrderBody).events.map((event) => event.kind)).toEqual(['received', 'preparing', 'delivered']);
    const refused = await agent.post(`/orders/${id}/advance`).expect(409);
    expect(refused.body).toMatchObject({ error: 'invalid_transition', status: 'delivered', action: 'advance' });
    await agent.post('/orders/nope/advance').expect(404);
  });

  it('cancels with a reason until delivered', async () => {
    const first = (await place({}).expect(201)).body as OrderBody;
    const cancelled = await agent.post(`/orders/${first.id}/cancel`).send({ reason: 'product_unavailable' }).expect(200);
    expect(cancelled.body).toMatchObject({ status: 'cancelled', cancellationReason: 'product_unavailable' });
    expect((cancelled.body as OrderBody).events.at(-1)).toMatchObject({ kind: 'cancelled', actor: { id: staff.id } });
    await agent.post(`/orders/${first.id}/advance`).expect(409);
    await agent.post(`/orders/${first.id}/cancel`).send({}).expect(400);

    const second = (await place({}).expect(201)).body as OrderBody;
    await agent.post(`/orders/${second.id}/advance`).expect(200);
    await agent.post(`/orders/${second.id}/advance`).expect(200);
    const late = await agent.post(`/orders/${second.id}/cancel`).send({ reason: 'customer_request' }).expect(409);
    expect(late.body).toMatchObject({ error: 'invalid_transition', status: 'delivered', action: 'cancel' });
  });
});
