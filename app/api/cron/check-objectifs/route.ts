import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MONTHLY_TARGET_FALLBACK = 50_000_000; // 50M FCFA
const CRON_SECRET = process.env.CRON_SECRET || "cron-secret";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const dayOfMonth = now.getDate();

  // Only check at mid-month or later
  if (dayOfMonth < 15) {
    return NextResponse.json({ message: "Pas encore mi-mois, vérification ignorée" });
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const results: { station: string; action: string }[] = [];

  for (const station of stations) {
    const salesAgg = await db.dailyIndex.aggregate({
      where: { stationId: station.id, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { revenue: true },
    });

    const ca = Number(salesAgg._sum.revenue || 0);
    const target = MONTHLY_TARGET_FALLBACK;

    // Check if CA < 80% of target at mid-month
    if (ca < target * 0.8) {
      // Check if alert already exists this month
      const existingAlert = await db.alert.findFirst({
        where: {
          stationId: station.id,
          type: "OBJECTIF_NON_ATTEINT",
          createdAt: { gte: startOfMonth },
        },
      });

      if (!existingAlert) {
        await db.alert.create({
          data: {
            type: "OBJECTIF_NON_ATTEINT",
            level: "ORANGE",
            message: `La station ${station.name} n'a réalisé que ${ca.toLocaleString("fr-CI")} FCFA sur un objectif de ${target.toLocaleString("fr-CI")} FCFA (${Math.round((ca / target) * 100)}%) à mi-mois.`,
            stationId: station.id,
          },
        });
        results.push({ station: station.name, action: "alerte créée" });
      } else {
        results.push({ station: station.name, action: "alerte déjà existante" });
      }
    } else {
      results.push({ station: station.name, action: "objectif atteint" });
    }
  }

  return NextResponse.json({ ok: true, results });
}
