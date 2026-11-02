import { beforeEach, describe, expect, it } from 'vitest';
import { createTablesDeps, STAFF } from '../../../../test/support/in-memory-tables.js';
import {
  InvalidSpaceError,
  InvalidTableError,
  SpaceNotFoundError,
  SpaceNotRemovableError,
  TableHasHistoryError,
  TableHasOpenSessionError,
  TableNotFoundError,
  TableOverlapError,
} from '../domain/tables-errors.js';
import { FindTableByNumber } from './find-table-by-number.js';
import { RegenerateTableQr, ResolveTableQr } from './qr.use-cases.js';
import { CreateSpace, DeleteSpace, MoveSpace, UpdateSpace } from './spaces.use-cases.js';
import { MoveTable, ResizeTable, SetTableShape } from './table-layout.use-cases.js';
import {
  CreateTable,
  DeleteTable,
  GetTablesConfiguration,
  SetTableEnabled,
  UpdateTable,
} from './tables.use-cases.js';

const draft = { label: 'Mesa 04', spaceId: 'salon', capacity: 4, description: '', enabled: true };

describe('tables use cases', () => {
  let deps: ReturnType<typeof createTablesDeps>;

  beforeEach(() => {
    deps = createTablesDeps();
  });

  const tableById = (id: string) => deps.tables.tables.find((table) => table.id === id);

  it('returns the configuration with the tables by number', async () => {
    const config = await new GetTablesConfiguration(deps).execute();
    expect(config.spaces.map((space) => space.id)).toEqual(['salon', 'terraza']);
    expect(config.tables.map((table) => table.number)).toEqual([1, 2, 3]);
  });

  describe('spaces', () => {
    it('creates a space with a slug id and the default style', async () => {
      const config = await new CreateSpace(deps).execute({ name: ' Barra alta ' });
      expect(config.spaces.at(-1)).toEqual({ id: 'barra-alta', name: 'Barra alta', icon: 'map-pin', tone: 'neutral' });
    });

    it('rejects a duplicate or empty name without saving', async () => {
      await expect(new CreateSpace(deps).execute({ name: 'salon' })).rejects.toMatchObject({
        issues: [{ path: 'name', code: 'duplicate' }],
      });
      await expect(new CreateSpace(deps).execute({ name: '' })).rejects.toBeInstanceOf(InvalidSpaceError);
      expect(deps.tables.spaces).toHaveLength(2);
    });

    it('renames and restyles a space keeping its id and the style not given', async () => {
      const config = await new UpdateSpace(deps).execute('salon', { name: 'Salón principal', tone: 'neutral' });
      expect(config.spaces[0]).toEqual({ id: 'salon', name: 'Salón principal', icon: 'store', tone: 'neutral' });
      await expect(new UpdateSpace(deps).execute('nope', { name: 'X' })).rejects.toBeInstanceOf(SpaceNotFoundError);
    });

    it('moves a space up or down; the ends stay', async () => {
      const config = await new MoveSpace(deps).execute('terraza', 'up');
      expect(config.spaces.map((space) => space.id)).toEqual(['terraza', 'salon']);
      const same = await new MoveSpace(deps).execute('terraza', 'up');
      expect(same.spaces.map((space) => space.id)).toEqual(['terraza', 'salon']);
    });

    it('deletes only an empty space that is not the last one', async () => {
      await expect(new DeleteSpace(deps).execute('salon')).rejects.toMatchObject({ reason: 'space_has_tables', tableCount: 2 });
      const created = await new CreateSpace(deps).execute({ name: 'Patio' });
      expect(created.spaces).toHaveLength(3);
      const config = await new DeleteSpace(deps).execute('patio');
      expect(config.spaces).toHaveLength(2);

      deps.tables.reset({ spaces: config.spaces.slice(0, 1), tables: [] });
      await expect(new DeleteSpace(deps).execute('salon')).rejects.toBeInstanceOf(SpaceNotRemovableError);
      await expect(new DeleteSpace(deps).execute('nope')).rejects.toBeInstanceOf(SpaceNotFoundError);
    });
  });

  describe('tables', () => {
    it('creates a table with the next number, a free spot and a fresh credential', async () => {
      const config = await new CreateTable(deps).execute({ ...draft, label: ' Mesa 04 ', shape: 'round' }, STAFF);
      expect(config.tables.at(-1)).toEqual({
        id: 'tbl_04',
        number: 4,
        ...draft,
        version: 1,
        layout: { x: 406, y: 64, width: 150, height: 132, shape: 'round' },
        qr: { token: 'TOKEN00001', issuedAt: deps.clock.now(), issuedBy: STAFF },
        revokedQrs: [],
      });
    });

    it('never reuses the number of a deleted table', async () => {
      await new DeleteTable(deps).execute('tbl_03');
      const config = await new CreateTable(deps).execute(draft, STAFF);
      expect(config.tables.at(-1)).toMatchObject({ id: 'tbl_04', number: 4 });
    });

    it('skips tokens already used by any credential, revoked ones included', async () => {
      deps.tokens.queue.push('Old02abcde', 'Tok01abcde', 'Fresh12345');
      const config = await new CreateTable(deps).execute(draft, STAFF);
      expect(config.tables.at(-1)?.qr?.token).toBe('Fresh12345');
    });

    it('rejects an invalid draft with field codes', async () => {
      const error = await new CreateTable(deps)
        .execute({ ...draft, label: 'mesa 01', spaceId: 'barra', capacity: 0 }, STAFF)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(InvalidTableError);
      expect((error as InvalidTableError).issues).toEqual([
        { path: 'label', code: 'duplicate' },
        { path: 'spaceId', code: 'unknown_space' },
        { path: 'capacity', code: 'out_of_range' },
      ]);
      expect(deps.tables.tables).toHaveLength(3);
    });

    it('updates a table keeping its number and credential, and bumps the version', async () => {
      const config = await new UpdateTable(deps).execute('tbl_02', { ...draft, label: 'Ventana', capacity: 6 });
      expect(config.tables[1]).toMatchObject({ id: 'tbl_02', number: 2, label: 'Ventana', capacity: 6, version: 19 });
      expect(config.tables[1]?.qr?.token).toBe('Tok02abcde');
      expect(config.tables[1]?.layout).toMatchObject({ x: 222, y: 64 });
      await expect(new UpdateTable(deps).execute('nope', draft)).rejects.toBeInstanceOf(TableNotFoundError);
    });

    it('re-places a table that changes space', async () => {
      const config = await new UpdateTable(deps).execute('tbl_01', { ...draft, label: 'Mesa 01', spaceId: 'terraza' });
      expect(config.tables[0]).toMatchObject({ spaceId: 'terraza', layout: { x: 222, y: 64, width: 150, height: 132 } });
    });

    it('enables and disables a table, bumping the version only on change', async () => {
      const disabled = await new SetTableEnabled(deps).execute('tbl_01', false);
      expect(disabled.tables[0]).toMatchObject({ enabled: false, version: 2 });
      const same = await new SetTableEnabled(deps).execute('tbl_01', false);
      expect(same.tables[0]?.version).toBe(2);
      const enabled = await new SetTableEnabled(deps).execute('tbl_01', true);
      expect(enabled.tables[0]).toMatchObject({ enabled: true, version: 3 });
    });

    it('blocks disabling a table with an open session, also through an update', async () => {
      deps.activity.byTable.set('tbl_01', { openSession: true, hadSession: true });
      await expect(new SetTableEnabled(deps).execute('tbl_01', false)).rejects.toBeInstanceOf(TableHasOpenSessionError);
      await expect(new UpdateTable(deps).execute('tbl_01', { ...draft, label: 'Mesa 01', enabled: false })).rejects.toBeInstanceOf(
        TableHasOpenSessionError,
      );
      expect(tableById('tbl_01')).toMatchObject({ enabled: true, version: 1 });
    });

    it('deletes a table that never had a session and retires its credential', async () => {
      const config = await new DeleteTable(deps).execute('tbl_02');
      expect(config.tables.map((table) => table.id)).toEqual(['tbl_01', 'tbl_03']);
      expect(deps.tables.retired.map((credential) => credential.token)).toEqual(['Tok02abcde', 'Old02abcde']);
      await expect(deps.tables.isTokenTaken('Tok02abcde')).resolves.toBe(true);
    });

    it('keeps tables with an open session or with history', async () => {
      deps.activity.byTable.set('tbl_01', { openSession: true, hadSession: true });
      deps.activity.byTable.set('tbl_02', { openSession: false, hadSession: true });
      await expect(new DeleteTable(deps).execute('tbl_01')).rejects.toBeInstanceOf(TableHasOpenSessionError);
      await expect(new DeleteTable(deps).execute('tbl_02')).rejects.toBeInstanceOf(TableHasHistoryError);
      expect(deps.tables.tables).toHaveLength(3);
    });
  });

  describe('layout', () => {
    it('moves a table to the snapped spot and bumps the version', async () => {
      const config = await new MoveTable(deps).execute('tbl_01', { x: -13, y: 5 });
      expect(config.tables[0]).toMatchObject({ layout: { x: 0, y: 8 }, version: 2 });
    });

    it('keeps the version when the table does not move', async () => {
      await new MoveTable(deps).execute('tbl_01', { x: 0, y: 8 });
      const config = await new MoveTable(deps).execute('tbl_01', { x: 3, y: 9 });
      expect(config.tables[0]).toMatchObject({ layout: { x: 0, y: 8 }, version: 2 });
    });

    it('refuses a move over another table of the space, naming it', async () => {
      const error = await new MoveTable(deps).execute('tbl_01', { x: 222, y: 64 }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(TableOverlapError);
      expect(error).toMatchObject({ conflict: { id: 'tbl_02', number: 2, label: 'Mesa 02' } });
      expect(tableById('tbl_01')?.layout).toMatchObject({ x: 38, y: 64 });
    });

    it('resizes to at least the chairs minimum', async () => {
      const config = await new ResizeTable(deps).execute('tbl_01', { x: 38, y: 64, width: 10, height: 10 });
      expect(config.tables[0]).toMatchObject({ layout: { width: 96, height: 88 }, version: 2 });
    });

    it('switches the shape, bumping the version only on change', async () => {
      const config = await new SetTableShape(deps).execute('tbl_01', 'round');
      expect(config.tables[0]).toMatchObject({ layout: { shape: 'round' }, version: 2 });
      const same = await new SetTableShape(deps).execute('tbl_01', 'round');
      expect(same.tables[0]?.version).toBe(2);
      await expect(new SetTableShape(deps).execute('nope', 'rect')).rejects.toBeInstanceOf(TableNotFoundError);
    });
  });

  describe('qr', () => {
    it('revokes the active credential with the next audit number and issues a new one', async () => {
      const config = await new RegenerateTableQr(deps).execute('tbl_01', STAFF);
      expect(config.tables[0]).toMatchObject({
        version: 2,
        qr: { token: 'TOKEN00001', issuedAt: deps.clock.now(), issuedBy: STAFF },
        revokedQrs: [{ token: 'Tok01abcde', revokedAt: deps.clock.now(), auditNumber: 119 }],
      });
      const again = await new RegenerateTableQr(deps).execute('tbl_01', STAFF);
      expect(again.tables[0]?.revokedQrs.map((credential) => credential.auditNumber)).toEqual([120, 119]);
    });

    it('resolves the public table only for its active token while enabled', async () => {
      const resolve = new ResolveTableQr(deps);
      await expect(resolve.execute({ number: 2, token: 'Tok02abcde' })).resolves.toEqual({ number: 2, label: 'Mesa 02', spaceName: 'Salón' });
      await expect(resolve.execute({ number: 2, token: 'Old02abcde' })).rejects.toBeInstanceOf(TableNotFoundError);
      await expect(resolve.execute({ number: 1, token: 'Tok02abcde' })).rejects.toBeInstanceOf(TableNotFoundError);
      await expect(resolve.execute({ number: 9, token: 'Tok02abcde' })).rejects.toBeInstanceOf(TableNotFoundError);

      await new SetTableEnabled(deps).execute('tbl_02', false);
      await expect(resolve.execute({ number: 2, token: 'Tok02abcde' })).rejects.toBeInstanceOf(TableNotFoundError);
    });
  });

  it('looks a table up by number for other modules, disabled ones included', async () => {
    const find = new FindTableByNumber(deps);
    await expect(find.execute(3)).resolves.toEqual({ number: 3, label: 'Mesa 03', spaceName: 'Terraza', enabled: true });
    await new SetTableEnabled(deps).execute('tbl_03', false);
    await expect(find.execute(3)).resolves.toMatchObject({ number: 3, enabled: false });
    await expect(find.execute(9)).resolves.toBeNull();
  });
});
