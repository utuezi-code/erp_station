import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { CartesClient } from "./cartes-client";

export default async function CartesCarburantPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requireRole(["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const params = await searchParams;

  const [clients, stations, fuels] = await Promise.all([
    db.clientCompte.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        cartes: {
          include: {
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
          orderBy: { holderName: "asc" },
        },
      },
    }),
    db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, salePrice: true } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cartes carburant</h1>
        <p className="text-gray-500 mt-1">Gestion des comptes clients et cartes de ravitaillement</p>
      </div>
      <CartesClient
        clients={clients.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          cartes: c.cartes.map((carte) => ({
            ...carte,
            solde: Number(carte.solde),
            plafond: carte.plafond ? Number(carte.plafond) : null,
            createdAt: carte.createdAt.toISOString(),
            transactions: carte.transactions.map((t) => ({
              ...t,
              date: t.date.toISOString(),
              volume: Number(t.volume),
              unitPrice: Number(t.unitPrice),
              amount: Number(t.amount),
              createdAt: t.createdAt.toISOString(),
            })),
          })),
        }))}
        stations={stations}
        fuels={fuels.map((f) => ({ ...f, salePrice: Number(f.salePrice) }))}
        selectedClientId={params.clientId || ""}
      />
    </div>
  );
}
