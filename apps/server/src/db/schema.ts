import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:        text('id').primaryKey(),
  email:     text('email').notNull().unique(),
  name:      text('name').notNull(),
  password:  text('password').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull(),
})

// ─── Documents ───────────────────────────────────────────────────────────────
export const documents = sqliteTable('documents', {
  id:        text('id').primaryKey(),
  title:     text('title').notNull().default('Untitled'),
  content:   text('content').notNull().default('{}'),
  ownerId:   text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublic:  integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ─── Share Tokens ─────────────────────────────────────────────────────────────
export const shareTokens = sqliteTable('share_tokens', {
  token:      text('token').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  mode:       text('mode', { enum: ['readonly', 'collab'] }).notNull(),
  createdBy:  text('created_by').notNull().references(() => users.id),
  expiresAt:  text('expires_at'),
  createdAt:  text('created_at').notNull(),
})

export type User          = typeof users.$inferSelect
export type NewUser       = typeof users.$inferInsert
export type Document      = typeof documents.$inferSelect
export type NewDocument   = typeof documents.$inferInsert
export type ShareToken    = typeof shareTokens.$inferSelect
export type NewShareToken = typeof shareTokens.$inferInsert
