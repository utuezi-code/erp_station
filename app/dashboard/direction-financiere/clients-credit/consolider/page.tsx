import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { ConsoliderClient } from "./consolider-client";

export default async function ConsoliderPage() {
  await requireRole(["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const annee = new Date().getFullYear();

  const fuels = await db.fuel.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true, salePrice: true },
    orderBy: { name: "asc" },
  });

  const CREDIT_TYPES = new Set(["NOTE_CREDIT", "REMISE", "AUTRE_CREDIT"]);

  const rawClients = await db.clientCreditCompte.findMany({
    orderBy: { nom: "asc" },
    include: {
      soldeInitiaux: { where: { annee } },
      livraisons: {
        select: { montant: true, quantite: true, fuelId: true, date: true },
      },
      mouvements: { select: { type: true, montant: true } },
      conditionsCarb: {
        include: { fuel: { select: { id: true, name: true, code: true, salePrice: true } } },
      },
    },
  });

  const rows = rawClients.map((c, i) => {
    const soldeInitial = Number(c.soldeInitiaux[0]?.solde ?? 0);
    const totalDebit = c.livraisons.reduce((s, l) => s + Number(l.montant), 0);
    const totalCredit = c.mouvements.reduce((s, m) => {
      const amount = Number(m.montant);
      return CREDIT_TYPES.has(m.type) ? s + amount : s - amount;
    }, 0);
    const solde = soldeInitial + totalDebit - totalCredit;

    // Volumes par carburant
    const volParFuel: Record<string, number> = {};
    let derniereLivraison: string | null = null;
    for (const l of c.livraisons) {
      volParFuel[l.fuelId] = (volParFuel[l.fuelId] ?? 0) + Number(l.quantite);
      const ld = new Date(l.date).toISOString().slice(0, 10);
      if (!derniereLivraison || ld > derniereLivraison) derniereLivraison = ld;
    }

    return {
      num: i + 1,
      id: c.id,
      nom: c.nom,
      code: c.code,
      active: c.active,
      delaiReglement: c.delaiReglement,
      typeContrat: c.typeContrat,
      creditStation: Number(c.creditStation ?? 0),
      soldeInitial,
      totalDebit,
      totalCredit,
      solde,
      volParFuel,
      derniereLivraison,
      conditions: c.conditionsCarb.map((cc) => ({
        fuelId: cc.fuelId,
        fuelName: cc.fuel.name,
        fuelCode: cc.fuel.code,
        puPompe: Number(cc.puPompe),
        remise: Number(cc.remise),
        stockActuel: Number(cc.stockActuel),
        salePrice: Number(cc.fuel.salePrice),
      })),
    };
  });

  return (
    <ConsoliderClient
      rows={serialize(rows)}
      fuels={serialize(fuels)}
      annee={annee}
    />
  );
}
