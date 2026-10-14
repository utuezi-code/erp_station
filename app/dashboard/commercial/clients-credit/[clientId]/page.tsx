import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { ClientDetailPage } from "./client-detail";

export default async function ClientCreditDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ annee?: string }>;
}) {
  await requireRole(["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const { clientId } = await params;
  const sp = await searchParams;
  const annee = sp.annee ? parseInt(sp.annee) : new Date().getFullYear();

  const client = await db.clientCreditCompte.findUnique({
    where: { id: clientId },
  });
  if (!client) notFound();

  const soldeInitial = await db.clientCreditSoldeInitial.findUnique({
    where: { clientId_annee: { clientId, annee } },
  });

  const livraisons = await db.clientCreditLivraison.findMany({
    where: { clientId },
    include: { fuel: { select: { name: true, code: true } } },
    orderBy: { date: "asc" },
  });

  const mouvements = await db.mouvementClientCredit.findMany({
    where: { clientId },
    orderBy: { date: "asc" },
  });

  return (
    <ClientDetailPage
      client={serialize(client)}
      soldeInitial={serialize(soldeInitial)}
      livraisons={serialize(livraisons)}
      mouvements={serialize(mouvements)}
      annee={annee}
    />
  );
}
