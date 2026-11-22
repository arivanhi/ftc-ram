import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export type AssetSpec = { label: string; value: string };

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => adminUsers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const buildings = pgTable('buildings', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  icon: text('icon').notNull().default('domain'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const floors = pgTable(
  'floors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),
    floorNumber: integer('floor_number').notNull(),
    label: text('label').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('floors_building_number_idx').on(t.buildingId, t.floorNumber)],
);

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  floorId: uuid('floor_id')
    .notNull()
    .references(() => floors.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  picName: text('pic_name').notNull().default(''),
  picExt: text('pic_ext').notNull().default(''),
  capacity: integer('capacity').notNull().default(10),
  operatingHours: text('operating_hours').notNull().default('08.00 - 16.30 WIB'),
  gridZone: text('grid_zone').notNull().default('top'),
  gridColSpan: integer('grid_col_span').notNull().default(4),
  sortOrder: integer('sort_order').notNull().default(0),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  roleTitle: text('role_title').notNull(),
  specialization: text('specialization').notNull().default(''),
  roomLabel: text('room_label').notNull().default(''),
  dutyHours: text('duty_hours').notNull().default('08:00 - 16:00 WIB'),
  availabilityStatus: text('availability_status').notNull().default('available'),
  whatsapp: text('whatsapp').notNull(),
  email: text('email').notNull(),
  photoUrl: text('photo_url'),
  isEmergency: boolean('is_emergency').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  inventoryCode: text('inventory_code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull().default(''),
  specifications: jsonb('specifications').$type<AssetSpec[]>().notNull().default([]),
  condition: text('condition').notNull().default('prima'),
  availability: text('availability').notNull().default('tersedia'),
  completionDate: date('completion_date').notNull(),
  researchScheme: text('research_scheme'),
  researcherTeam: text('researcher_team'),
  photoUrl: text('photo_url'),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  placementDetail: text('placement_detail'),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  usageSummary: text('usage_summary'),
  isPriority: boolean('is_priority').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tutorials = pgTable('tutorials', {
  id: uuid('id').defaultRandom().primaryKey(),
  docCode: text('doc_code').notNull().unique(),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  category: text('category').notNull().default('pengoperasian'),
  format: text('format').notNull().default('panduan_teks'),
  summary: text('summary').notNull().default(''),
  stepsMarkdown: text('steps_markdown'),
  fileUrl: text('file_url'),
  videoUrl: text('video_url'),
  version: text('version').notNull().default('1.0'),
  instructorName: text('instructor_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const loans = pgTable('loans', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketCode: text('ticket_code').notNull().unique(),
  borrowerName: text('borrower_name').notNull(),
  borrowerIdType: text('borrower_id_type').notNull(),
  borrowerIdValue: text('borrower_id_value').notNull(),
  borrowerEmail: text('borrower_email'),
  borrowerWhatsapp: text('borrower_whatsapp').notNull(),
  borrowerUnitDetail: text('borrower_unit_detail'),
  purposeTitle: text('purpose_title').notNull(),
  usageLocationType: text('usage_location_type').notNull().default('internal'),
  externalLocationDetail: text('external_location_detail'),
  fundingCategory: text('funding_category').notNull().default('Pameran / Expo FTC'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  dailySession: text('daily_session').notNull().default('Sesi Penuh (08.00 - 17.00 WIB)'),
  attachmentUrl: text('attachment_url'),
  integrityAgreed: boolean('integrity_agreed').notNull().default(false),
  status: text('status').notNull().default('pending'),
  adminNotes: text('admin_notes'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  borrowedAt: timestamp('borrowed_at', { withTimezone: true }),
  returnedAt: timestamp('returned_at', { withTimezone: true }),
  returnReminderSentAt: timestamp('return_reminder_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const loanItems = pgTable(
  'loan_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    loanId: uuid('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    returnCondition: text('return_condition'),
    returnNotes: text('return_notes'),
  },
  (t) => [uniqueIndex('loan_items_loan_asset_idx').on(t.loanId, t.assetId)],
);

export const issueTickets = pgTable('issue_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketCode: text('ticket_code').notNull().unique(),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  assetCodeInput: text('asset_code_input').notNull(),
  reporterName: text('reporter_name').notNull(),
  reporterContact: text('reporter_contact').notNull(),
  category: text('category').notNull().default('kerusakan'),
  urgency: text('urgency').notNull().default('sedang'),
  description: text('description').notNull(),
  photoUrl: text('photo_url'),
  assignedContactId: uuid('assigned_contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('open'),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const faqs = pgTable('faqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const researchGroups = pgTable('research_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const smtpSettings = pgTable('smtp_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  smtpHost: text('smtp_host').notNull().default('smtp.gmail.com'),
  smtpPort: integer('smtp_port').notNull().default(465),
  smtpUser: text('smtp_user').notNull().default(''),
  smtpPasswordEnc: text('smtp_password_enc').notNull().default(''),
  senderName: text('sender_name').notNull().default('SIM-Aset Penelitian FTC UDINUS'),
  adminNotifyEmail: text('admin_notify_email').notNull().default(''),
  reminderHoursBefore: integer('reminder_hours_before').notNull().default(24),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AssetRow = typeof assets.$inferSelect;
export type LoanRow = typeof loans.$inferSelect;
export type LoanItemRow = typeof loanItems.$inferSelect;
export type RoomRow = typeof rooms.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type TutorialRow = typeof tutorials.$inferSelect;
export type IssueTicketRow = typeof issueTickets.$inferSelect;
export type FaqRow = typeof faqs.$inferSelect;
export type ResearchGroupRow = typeof researchGroups.$inferSelect;
export type SmtpSettingsRow = typeof smtpSettings.$inferSelect;
