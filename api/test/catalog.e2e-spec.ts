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
import { ResolveOrderableProducts } from '../src/modules/catalog/application/resolve-orderable-products.js';
import { CATALOG_ID_GENERATOR, CATALOG_REPOSITORY } from '../src/modules/catalog/catalog.tokens.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createAuthDeps, staffUser, STRONG_PASSWORD } from './support/in-memory-auth.js';
import { catalogFixture, createCatalogDeps } from './support/in-memory-catalog.js';

const ids = (response: { body: unknown }) => (response.body as { id: string }[]).map((item) => item.id);

describe('catalog HTTP (e2e)', () => {
  let app: INestApplication<Server>;
  /** Signed in once: login is rate limited. */
  let agent: ReturnType<typeof request.agent>;
  const auth = createAuthDeps();
  const catalog = createCatalogDeps();

  beforeAll(async () => {
    auth.users.add(staffUser({ role: 'STAFF' }));
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
      .useValue(catalog.catalog)
      .overrideProvider(CATALOG_ID_GENERATOR)
      .useValue(catalog.ids)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app, []);
    await app.init();
    agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email: 'turno@cafecentral.com', password: STRONG_PASSWORD }).expect(200);
  });

  beforeEach(() => {
    catalog.catalog.reset(catalogFixture());
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    const server = app.getHttpServer();
    await request(server).get('/catalog/categories').expect(401);
    await request(server).post('/catalog/categories').send({ name: 'Postres' }).expect(401);
    await request(server).get('/catalog/products').expect(401);
    await request(server).post('/catalog/products/prod_latte/archive').expect(401);
  });

  it('manages categories', async () => {
    const created = await agent.post('/catalog/categories').send({ name: 'Tostadas dulces', description: 'Para la tarde' }).expect(201);
    expect((created.body as unknown[]).at(-1)).toMatchObject({ id: 'tostadas-dulces', visible: true, position: 2, description: 'Para la tarde' });

    const edited = await agent.patch('/catalog/categories/tostadas-dulces').send({ visible: false }).expect(200);
    expect((edited.body as unknown[]).at(-1)).toMatchObject({ id: 'tostadas-dulces', name: 'Tostadas dulces', visible: false });

    const reordered = await agent.put('/catalog/categories/order').send({ ids: ['tostadas-dulces', 'cafes', 'bebidas'] }).expect(200);
    expect(ids(reordered)).toEqual(['tostadas-dulces', 'cafes', 'bebidas']);
    const removed = await agent.delete('/catalog/categories/tostadas-dulces').expect(200);
    expect(ids(removed)).toEqual(['cafes', 'bebidas']);

    const duplicate = await agent.post('/catalog/categories').send({ name: 'CAFÉS' }).expect(400);
    expect(duplicate.body).toMatchObject({ error: 'invalid_category', issues: [{ path: 'name', code: 'duplicate' }] });
    const badOrder = await agent.put('/catalog/categories/order').send({ ids: ['cafes'] }).expect(400);
    expect(badOrder.body).toMatchObject({ issues: [{ path: 'ids', code: 'not_a_permutation' }] });
    const busy = await agent.delete('/catalog/categories/cafes').expect(409);
    expect(busy.body).toMatchObject({ error: 'category_has_products', productCount: 2 });
    await agent
      .patch('/catalog/categories/nope')
      .send({ name: 'X' })
      .expect(404, { statusCode: 404, error: 'category_not_found', message: 'Category not found' });
    await agent.post('/catalog/categories').send({ name: 7 }).expect(400);
  });

  it('lists and gets products', async () => {
    expect(ids(await agent.get('/catalog/products').expect(200))).toEqual(['prod_tea', 'prod_lemonade', 'prod_latte']);
    const cafes = await agent.get('/catalog/products').query({ categoryId: 'cafes', includeArchived: 'true' }).expect(200);
    expect(ids(cafes)).toEqual(['prod_latte', 'prod_mocha']);

    const latte = await agent.get('/catalog/products/prod_latte').expect(200);
    expect(latte.body).toMatchObject({
      sku: 'CAF-001',
      updatedAt: '2026-10-21T12:00:00.000Z',
      optionGroups: [{ id: 'grp_milk', max: 1, defaultOptionId: 'opt_whole', options: [{ id: 'opt_whole' }, { id: 'opt_oat' }] }],
    });
    await agent.get('/catalog/products/nope').expect(404);
    await agent.get('/catalog/products').query({ includeArchived: 'yes' }).expect(400);
  });

  it('creates and edits products with their option groups', async () => {
    const created = await agent
      .post('/catalog/products')
      .send({
        name: 'Cortado',
        price: 3000,
        categoryId: 'cafes',
        publication: 'published',
        optionGroups: [
          { title: 'Extras', selection: 'multiple', required: false, max: 2, options: [{ name: 'Canela', priceDelta: 0 }] },
        ],
      })
      .expect(201);
    const product = created.body as { id: string; optionGroups: { id: string; options: { id: string }[] }[] };
    expect(created.body).toMatchObject({ sku: 'CAF-003', position: 3, version: 1, publication: 'published', archived: false });

    const group = product.optionGroups[0];
    const edited = await agent
      .patch(`/catalog/products/${product.id}`)
      .send({
        description: 'Espresso cortado',
        optionGroups: [{ ...group, options: [...(group?.options ?? []), { name: 'Cacao', priceDelta: 300 }] }],
      })
      .expect(200);
    expect(edited.body).toMatchObject({
      description: 'Espresso cortado',
      version: 2,
      optionGroups: [{ id: group?.id, options: [{ id: group?.options[0]?.id, name: 'Canela' }, { name: 'Cacao', priceDelta: 300 }] }],
    });

    const invalid = await agent
      .post('/catalog/products')
      .send({
        name: 'Latte',
        price: -5,
        categoryId: 'cafes',
        optionGroups: [{ title: 'Leche', selection: 'single', required: true, max: 2, defaultOption: 'Soja', options: [] }],
      })
      .expect(400);
    expect(invalid.body).toMatchObject({
      error: 'invalid_product',
      issues: [
        { path: 'name', code: 'duplicate' },
        { path: 'price', code: 'out_of_range' },
        { path: 'optionGroups.0.max', code: 'out_of_range' },
        { path: 'optionGroups.0.defaultOption', code: 'unknown_option' },
        { path: 'optionGroups.0.options', code: 'required' },
      ],
    });
    await agent.post('/catalog/products').send({ name: 'Sin precio', categoryId: 'cafes' }).expect(400);
    await agent.patch('/catalog/products/prod_mocha').send({ price: 1 }).expect(409);
  });

  it('archives and restores products', async () => {
    const archived = await agent.post('/catalog/products/prod_latte/archive').expect(200);
    expect(archived.body).toMatchObject({ archived: true, version: 2 });
    expect(ids(await agent.get('/catalog/products').query({ categoryId: 'cafes' }))).toEqual([]);
    const restored = await agent.post('/catalog/products/prod_latte/restore').expect(200);
    expect(restored.body).toMatchObject({ archived: false, publication: 'draft', version: 3 });
    await agent.post('/catalog/products/nope/archive').expect(404);
  });

  it('exports the orderable resolution for other modules', async () => {
    const resolutions = await app.get(ResolveOrderableProducts).execute(['prod_latte', 'prod_tea', 'nope']);
    expect(resolutions.map(({ id, orderable, block }) => ({ id, orderable, block }))).toEqual([
      { id: 'prod_latte', orderable: true, block: null },
      { id: 'prod_tea', orderable: false, block: 'draft' },
      { id: 'nope', orderable: false, block: 'not_found' },
    ]);
  });
});
