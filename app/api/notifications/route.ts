import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const alerts = await db.alert.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { station: { select: { name: true } } },
  });

  const unread = alerts.filter((a) => !a.read).length;

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      message: a.message,
      level: a.level,
      type: a.type,
      read: a.read,
      createdAt: a.createdAt.toISOString(),
      stationName: a.station?.name ?? null,
    })),
    unread,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  await db.alert.updateMany({ where: { read: false }, data: { read: true } });
  return NextResponse.json({ success: true });
}
