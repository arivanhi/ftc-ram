import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, buildings, contacts, floors, issueTickets, rooms } from '@/db/schema';

export type CatalogQueryParams = {
  q?: string;
  category?: string;
  roomId?: string;
  condition?: string;
  availability?: string;
  sort?: string;
  page?: number;
  limit?: number;
  maxLimit?: number;
};

export function normalizePagination(
  rawPage: number | undefined,
  rawLimit: number | undefined,
  maxLimit = 100,
): { page: number; limit: number; offset: number } {
  const safePage = typeof rawPage === 'number' && Number.isFinite(rawPage) ? Math.trunc(rawPage) : 1;
  const safeLimit = typeof rawLimit === 'number' && Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 12;
  const page = Math.max(1, safePage);
  const limit = Math.min(maxLimit, Math.max(1, safeLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export async function queryPublicAssets(params: CatalogQueryParams) {
  const conditions = [isNull(assets.archivedAt)];
  if (params.q?.trim()) {
    const pattern = `%${params.q.trim()}%`;
    conditions.push(
      or(
        ilike(assets.name, pattern),
        ilike(assets.inventoryCode, pattern),
        ilike(assets.category, pattern),
        ilike(assets.researcherTeam, pattern),
        ilike(assets.placementDetail, pattern),
      )!,
    );
  }
  if (params.category) conditions.push(eq(assets.category, params.category));
  if (params.roomId) conditions.push(eq(assets.roomId, params.roomId));
  if (params.condition) conditions.push(eq(assets.condition, params.condition));
  if (params.availability) conditions.push(eq(assets.availability, params.availability));

  const orderBy =
    params.sort === 'code'
      ? asc(assets.inventoryCode)
      : params.sort === 'completion_date'
        ? desc(assets.completionDate)
        : params.sort === 'priority'
          ? desc(assets.isPriority)
          : desc(assets.createdAt);

  const { page, limit, offset } = normalizePagination(
    params.page,
    params.limit,
    params.maxLimit ?? 100,
  );

  const whereClause = and(...conditions);

  const [rows, countRows, kpiRows, urgentRows, openIssuesRows, categoryRows, roomRows] =
    await Promise.all([
      db
        .select({
          id: assets.id,
          inventoryCode: assets.inventoryCode,
          name: assets.name,
          category: assets.category,
          description: assets.description,
          specifications: assets.specifications,
          condition: assets.condition,
          availability: assets.availability,
          completionDate: assets.completionDate,
          researchScheme: assets.researchScheme,
          researcherTeam: assets.researcherTeam,
          photoUrl: assets.photoUrl,
          roomId: assets.roomId,
          placementDetail: assets.placementDetail,
          contactId: assets.contactId,
          usageSummary: assets.usageSummary,
          isPriority: assets.isPriority,
          roomCode: rooms.code,
          roomName: rooms.name,
          floorLabel: floors.label,
          buildingName: buildings.name,
          contactName: contacts.name,
          contactWhatsapp: contacts.whatsapp,
        })
        .from(assets)
        .leftJoin(rooms, eq(assets.roomId, rooms.id))
        .leftJoin(floors, eq(rooms.floorId, floors.id))
        .leftJoin(buildings, eq(floors.buildingId, buildings.id))
        .leftJoin(contacts, eq(assets.contactId, contacts.id))
        .where(whereClause)
        .orderBy(orderBy, asc(assets.inventoryCode))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(assets)
        .where(whereClause),
      db
        .select({
          total: sql<number>`count(*)::int`,
          prima: sql<number>`count(*) filter (where ${assets.condition} = 'prima')::int`,
          maintenance: sql<number>`count(*) filter (where ${assets.condition} = 'maintenance')::int`,
          rusak: sql<number>`count(*) filter (where ${assets.condition} = 'rusak')::int`,
          dipinjam: sql<number>`count(*) filter (where ${assets.availability} = 'dipinjam')::int`,
        })
        .from(assets)
        .where(isNull(assets.archivedAt)),
      db
        .select({
          id: assets.id,
          inventoryCode: assets.inventoryCode,
          name: assets.name,
          condition: assets.condition,
          roomCode: rooms.code,
        })
        .from(assets)
        .leftJoin(rooms, eq(assets.roomId, rooms.id))
        .where(and(isNull(assets.archivedAt), or(eq(assets.condition, 'rusak'), eq(assets.condition, 'maintenance'))))
        .orderBy(desc(assets.updatedAt))
        .limit(6),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(issueTickets)
        .where(or(eq(issueTickets.status, 'open'), eq(issueTickets.status, 'in_progress'))),
      db
        .selectDistinct({ category: assets.category })
        .from(assets)
        .where(isNull(assets.archivedAt))
        .orderBy(asc(assets.category)),
      db
        .select({
          id: rooms.id,
          code: rooms.code,
          name: rooms.name,
          buildingName: buildings.name,
          floorLabel: floors.label,
        })
        .from(rooms)
        .innerJoin(floors, eq(rooms.floorId, floors.id))
        .innerJoin(buildings, eq(floors.buildingId, buildings.id))
        .orderBy(asc(buildings.sortOrder), asc(floors.floorNumber), asc(rooms.code)),
    ]);

  const total = countRows[0]?.count ?? 0;
  return {
    items: rows,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    kpis: kpiRows[0] ?? { total: 0, prima: 0, maintenance: 0, rusak: 0, dipinjam: 0 },
    urgentAssets: urgentRows,
    openIssueCount: openIssuesRows[0]?.count ?? 0,
    filters: {
      categories: categoryRows.map((c) => c.category),
      rooms: roomRows,
    },
  };
}
