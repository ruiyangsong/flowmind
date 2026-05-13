import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:        text('id').primaryKey(),
  email:     text('email').notNull().unique(),
  name:      text('name').notNull(),
  password:  text('password').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull(),
})

export const documents = sqliteTable('documents', {
  id:        text('id').primaryKey(),
  title:     text('title').notNull().default('Untitled'),
  content:   text('content').notNull().default('{}'),
  ownerId:   text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublic:  integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

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
export const uploads = sqliteTable('uploads', {
  id:           text('id').primaryKey(),
  ownerId:      text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentHash:  text('content_hash').notNull(),
  size:         integer('size').notNull(),
  mime:         text('mime').notNull(),
  originalName: text('original_name').notNull(),
  storageKey:   text('storage_key').notNull(),  // e.g. ab/abcdef... .png — driver-relative path
  driver:       text('driver').notNull().default('local'),
  createdAt:    text('created_at').notNull(),
})

export type ShareToken    = typeof shareTokens.$inferSelect
export type NewShareToken = typeof shareTokens.$inferInsert
export type Upload        = typeof uploads.$inferSelect
export type NewUpload     = typeof uploads.$inferInsert
