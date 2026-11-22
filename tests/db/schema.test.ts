import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '@/db/schema';

describe('PostgreSQL Drizzle schema contracts', () => {
  const tables = [
    schema.adminUsers,
    schema.adminSessions,
    schema.buildings,
    schema.floors,
    schema.rooms,
    schema.contacts,
    schema.assets,
    schema.tutorials,
    schema.loans,
    schema.loanItems,
    schema.issueTickets,
    schema.faqs,
    schema.researchGroups,
  ];

  it('uses native PostgreSQL uuid PK on all 13 tables', () => {
    for (const table of tables) {
      const cfg = getTableConfig(table);
      const idCol = cfg.columns.find((c) => c.name === 'id');
      expect(idCol, `${cfg.name} missing id column`).toBeDefined();
      expect(idCol!.dataType).toBe('string');
      expect(idCol!.columnType).toBe('PgUUID');
      expect(idCol!.primary).toBe(true);
    }
  });

  it('includes completion_date and archived_at on assets', () => {
    const cols = getTableConfig(schema.assets).columns.map((c) => c.name);
    expect(cols).toEqual(
      expect.arrayContaining([
        'inventory_code',
        'completion_date',
        'placement_detail',
        'usage_summary',
        'condition',
        'availability',
        'archived_at',
      ]),
    );
  });

  it('records per-item return_condition and return_notes on loan_items and omits return_condition_notes on loans', () => {
    const loanCols = getTableConfig(schema.loans).columns.map((c) => c.name);
    const itemCols = getTableConfig(schema.loanItems).columns.map((c) => c.name);
    expect(loanCols).toContain('borrower_id_type');
    expect(loanCols).not.toContain('return_condition_notes');
    expect(itemCols).toEqual(expect.arrayContaining(['return_condition', 'return_notes']));
  });
});
