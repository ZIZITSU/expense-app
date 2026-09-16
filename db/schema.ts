// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
  id: text('id').primaryKey(), user: text('user').notNull(), kind: text('kind').notNull(),
  data: text('data').notNull(), deleted: integer('deleted').notNull().default(0), version: integer('version').notNull().default(1), updated: text('updated').notNull(),
},table=>[index('idx_records_user_kind').on(table.user,table.kind)]);
export const history = sqliteTable('history', { id: text('id').primaryKey(), user: text('user').notNull(), record: text('record').notNull(), data: text('data').notNull(), date: text('date').notNull() });
export const backups = sqliteTable('backups', { id: text('id').primaryKey(), user: text('user').notNull(), data: text('data').notNull(), date: text('date').notNull() });
export const metadata = sqliteTable('metadata', { user: text('user').primaryKey(), initialized: integer('initialized').notNull() });
