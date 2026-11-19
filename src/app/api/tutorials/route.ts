import { NextResponse } from 'next/server';
import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { assets, contacts, faqs, tutorials } from '@/db/schema';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const category = (searchParams.get('category') || '').trim();

  const conds = [];
  if (q) {
    const p = `%${q}%`;
    conds.push(
      or(
        ilike(tutorials.title, p),
        ilike(tutorials.docCode, p),
        ilike(tutorials.summary, p),
        ilike(assets.name, p),
        ilike(assets.inventoryCode, p),
      )!,
    );
  }
  if (category) conds.push(eq(tutorials.category, category));

  const [tutorialRows, faqRows, supportContacts] = await Promise.all([
    db
      .select({
        tutorial: tutorials,
        assetId: assets.id,
        assetName: assets.name,
        assetInventoryCode: assets.inventoryCode,
      })
      .from(tutorials)
      .leftJoin(assets, eq(tutorials.assetId, assets.id))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(tutorials.updatedAt)),
    db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.createdAt)),
    db.select().from(contacts).orderBy(desc(contacts.isEmergency), asc(contacts.code)).limit(3),
  ]);

  return NextResponse.json({
    items: tutorialRows.map((r) => ({
      ...r.tutorial,
      asset: r.assetId
        ? { id: r.assetId, name: r.assetName, inventoryCode: r.assetInventoryCode }
        : null,
    })),
    faqs: faqRows,
    supportContacts,
  });
}
