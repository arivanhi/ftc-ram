import { z } from 'zod';
import { isSafeHttpUrl } from '@/lib/format';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const optionalNullableUuid = z.union([z.string().uuid(), z.literal(''), z.null()]).optional().transform((v) => (v ? v : null));
const optionalNullableText = z.string().trim().max(4000).nullable().optional().transform((v) => (v && v.length > 0 ? v : null));
const safeHttpUrlSchema = z
  .string()
  .trim()
  .min(8)
  .max(500)
  .refine((v) => isSafeHttpUrl(v), { message: 'URL harus diawali http:// atau https:// yang valid.' });
const optionalNullableHttpUrl = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || isSafeHttpUrl(v), {
    message: 'Tautan video harus berupa URL http:// atau https:// yang valid.',
  });

export const assetSpecSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(300),
});

const optionalInventoryCode = z
  .string()
  .trim()
  .max(60)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => v === undefined || v.length >= 2, {
    message: 'Kode inventaris minimal 2 karakter.',
  });

export const assetInputSchema = z.object({
  inventoryCode: optionalInventoryCode,
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000).optional().default(''),
  specifications: z.array(assetSpecSchema).max(20).optional().default([]),
  condition: z.enum(['prima', 'maintenance', 'rusak']).default('prima'),
  availability: z.enum(['tersedia', 'dipinjam', 'tidak_tersedia']).optional().default('tersedia'),
  completionDate: z.string().regex(ISO_DATE_RE, 'Format tanggal jadi harus YYYY-MM-DD'),
  researchScheme: optionalNullableText,
  researcherTeam: optionalNullableText,
  photoUrl: optionalNullableText,
  roomId: optionalNullableUuid,
  placementDetail: optionalNullableText,
  contactId: optionalNullableUuid,
  usageSummary: optionalNullableText,
  isPriority: z.boolean().optional().default(false),
});

export const assetPatchSchema = assetInputSchema.partial().extend({
  restore: z.boolean().optional(),
});

export const buildingInputSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(200).optional().default(''),
  icon: z.string().trim().max(60).optional().default('domain'),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
});

export const floorInputSchema = z.object({
  buildingId: z.string().uuid(),
  floorNumber: z.coerce.number().int().min(-2).max(50),
  label: z.string().trim().min(1).max(40),
});

export const roomInputSchema = z.object({
  floorId: z.string().uuid(),
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(240).optional().default(''),
  picName: z.string().trim().max(120).optional().default(''),
  picExt: z.string().trim().max(40).optional().default(''),
  capacity: z.coerce.number().int().min(1).max(500).optional().default(10),
  operatingHours: z.string().trim().max(80).optional().default('08.00 - 16.30 WIB'),
  gridZone: z.enum(['top', 'bottom']).default('top'),
  gridColSpan: z.coerce.number().int().min(1).max(12).default(4),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  notes: z.string().trim().max(2000).optional().default(''),
});

export const contactInputSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(160),
  roleTitle: z.string().trim().min(2).max(160),
  specialization: z.string().trim().max(240).optional().default(''),
  roomLabel: z.string().trim().max(160).optional().default(''),
  dutyHours: z.string().trim().max(80).optional().default('08:00 - 16:00 WIB'),
  availabilityStatus: z.enum(['available', 'assisting', 'offline']).default('available'),
  whatsapp: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(160),
  photoUrl: optionalNullableText,
  isEmergency: z.boolean().optional().default(false),
});

export const tutorialInputSchema = z.object({
  docCode: z.string().trim().min(2).max(60),
  assetId: optionalNullableUuid,
  title: z.string().trim().min(3).max(240),
  category: z.enum(['pengoperasian', 'video_demo', 'persiapan_pameran', 'perawatan', 'k3']).default('pengoperasian'),
  format: z.enum(['panduan_teks', 'pdf', 'video', 'checklist']).default('panduan_teks'),
  summary: z.string().trim().max(1000).optional().default(''),
  stepsMarkdown: optionalNullableText,
  fileUrl: optionalNullableText,
  videoUrl: optionalNullableHttpUrl,
  version: z.string().trim().min(1).max(30).optional().default('1.0'),
  instructorName: optionalNullableText,
});

export const faqInputSchema = z.object({
  question: z.string().trim().min(5).max(400),
  answer: z.string().trim().min(5).max(4000),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
});

export const researchGroupInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  url: safeHttpUrlSchema,
  description: z.string().trim().max(300).optional().default(''),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
});

export const smtpSettingsInputSchema = z.object({
  enabled: z.boolean().default(false),
  smtpHost: z.string().trim().min(3).max(120).default('smtp.gmail.com'),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(465),
  smtpUser: z.union([z.string().trim().email().max(160), z.literal('')]).default(''),
  smtpPassword: z.string().max(200).optional(),
  clearPassword: z.boolean().optional(),
  senderName: z.string().trim().min(2).max(120).default('SIM-Aset Penelitian FTC UDINUS'),
  adminNotifyEmail: z.union([z.string().trim().email().max(160), z.literal('')]).default(''),
  reminderHoursBefore: z.coerce.number().int().min(1).max(168).default(24),
});

export const smtpTestInputSchema = z.object({
  to: z.string().trim().email('Alamat email tujuan tes tidak valid.').max(160),
});

const optionalNullableEmail = z
  .union([z.string().trim().email().max(160), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v && v.length > 0 ? v.toLowerCase() : null));

export const publicLoanInputSchema = z
  .object({
    borrowerName: z.string().trim().min(2).max(160),
    borrowerIdType: z.enum(['NIM', 'NPP', 'UNIT']),
    borrowerIdValue: z.string().trim().min(1).max(80),
    borrowerEmail: optionalNullableEmail,
    borrowerWhatsapp: z.string().trim().min(8).max(30),
    borrowerUnitDetail: optionalNullableText,
    purposeTitle: z.string().trim().min(3).max(240),
    usageLocationType: z.enum(['internal', 'external']).default('internal'),
    externalLocationDetail: optionalNullableText,
    fundingCategory: z.string().trim().min(2).max(120).default('Pameran / Expo FTC'),
    startDate: z.string().regex(ISO_DATE_RE),
    endDate: z.string().regex(ISO_DATE_RE),
    dailySession: z.string().trim().min(2).max(120).default('Sesi Penuh (08.00 - 17.00 WIB)'),
    assetIds: z.array(z.string().uuid()).min(1).max(3),
    integrityAgreed: z.literal(true),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
    path: ['endDate'],
  })
  .refine((v) => new Set(v.assetIds).size === v.assetIds.length, {
    message: 'Daftar aset tidak boleh duplikat.',
    path: ['assetIds'],
  });

const returnItemSchema = z.object({
  assetId: z.string().uuid(),
  returnCondition: z.enum(['prima', 'maintenance', 'rusak']),
  returnNotes: optionalNullableText,
});

export const adminLoanTransitionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('approved'), adminNotes: optionalNullableText }),
  z.object({ status: z.literal('rejected'), adminNotes: optionalNullableText }),
  z.object({ status: z.literal('cancelled'), adminNotes: optionalNullableText }),
  z.object({ status: z.literal('borrowed'), adminNotes: optionalNullableText }),
  z.object({
    status: z.literal('returned'),
    adminNotes: optionalNullableText,
    items: z.array(returnItemSchema).min(1),
  }),
]);

export const publicIssueInputSchema = z.object({
  assetId: optionalNullableUuid,
  assetCodeInput: z.string().trim().min(2).max(80),
  reporterName: z.string().trim().min(2).max(160),
  reporterContact: z.string().trim().min(4).max(120),
  category: z.enum(['kerusakan', 'konsultasi_demo', 'akses_sistem', 'perawatan']).default('kerusakan'),
  urgency: z.enum(['rendah', 'sedang', 'darurat']).default('sedang'),
  description: z.string().trim().min(8).max(4000),
  assignedContactId: optionalNullableUuid,
});

export const adminIssueUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']),
  resolutionNotes: optionalNullableText,
  assignedContactId: optionalNullableUuid,
  updateAssetCondition: z.enum(['prima', 'maintenance', 'rusak']).optional(),
});
