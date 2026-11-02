import type { TablesDeps } from './tables-deps.js';

/** What other modules learn about a table: its identity, where it is and whether it is enabled. */
export interface TableSummary {
  number: number;
  label: string;
  spaceName: string;
  enabled: boolean;
}

/** Application service exported for the orders module: the table with `number`, or null when none has it. */
export class FindTableByNumber {
  constructor(private readonly deps: TablesDeps) {}

  async execute(number: number): Promise<TableSummary | null> {
    const { spaces, tables } = await this.deps.tables.load();
    const table = tables.find((candidate) => candidate.number === number);
    if (!table) return null;
    const spaceName = spaces.find((space) => space.id === table.spaceId)?.name ?? '';
    return { number: table.number, label: table.label, spaceName, enabled: table.enabled };
  }
}
