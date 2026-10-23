"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { FraisClient } from "./frais-client";

export default async function FraisPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const stationId = (session.user as any).stationId as string;
  const sp = await searchParams;

  const now = new Date();
  const selectedDate = sp.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const date = new Date(selectedDate);

  const frais = await db.fraisJournalier.findMany({
    where: { stationId, date },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Frais journaliers</h1>
        <p className="text-gray-500 mt-1">Saisissez les charges du jour — elles apparaissent automatiquement dans le formulaire de versement.</p>
      </div>
      <FraisClient
        stationId={stationId}
        selectedDate={selectedDate}
        frais={serialize(frais)}
      />
    </div>
  );
}
