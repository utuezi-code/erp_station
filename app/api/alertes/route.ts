import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const level = searchParams.get("level") || undefined;
  const type = searchParams.get("type") || undefined;
  const stationId = searchParams.get("stationId") || undefined;
  const unreadOnly = searchParams.get("unreadOnly") === "1";

  const where: any = {};
  if (unreadOnly) where.read = false;
  if (level) where.level = level;
  if (type) where.type = type;
  if (stationId) where.stationId = stationId;

  const [alerts, unreadCount] = await Promise.all([
    db.alert.findMany({
      where,
      include: { station: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.alert.count({ where: { read: false } }),
  ]);

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      level: a.level,
      message: a.message,
      read: a.read,
      stationName: a.station?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    unreadCount,
  });
}
