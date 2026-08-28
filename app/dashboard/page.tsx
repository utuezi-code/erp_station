import { requireAuth } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import Link from "next/link";
import {
  Building2, Users, AlertTriangle, Wallet, TrendingUp, ArrowUpRight,
  Clock, Gauge, ArrowUpCircle, FileText, ShoppingCart, Trophy,
  BarChart3, GitCompare, Fuel, Landmark, Warehouse, Truck, Package,
  CheckCircle, Circle, MoreHorizontal, ChevronRight, Droplets,
  PackageCheck, BadgeCheck, TriangleAlert, Activity,
} from "lucide-react";

const fmt = (n: number) => n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
const fmtM = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)} k` : String(n);

async function getDashboardData(role: Role, userId: string, stationId?: string) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const isStation = role === "GERANT";
  const stationFilter = isStation && stationId ? { stationId } : {};

  // ── Core counts (all roles) ───────────────────────────────────────────────
  const [alertCount, versAttente] = await Promise.all([
    db.alert.count({ where: { read: false, ...(stationId ? { stationId } : {}) } }),
    db.versement.count({ where: { status: "EN_ATTENTE", ...stationFilter } }),
  ]);

  // ── Station / Gerant ──────────────────────────────────────────────────────
  let stationData: {
    stationName: string;
    todayIndexCount: number;
    monthVersTotal: number;
    versAttente: number;
    lastAlert: { message: string; level: string } | null;
  } | null = null;

  if (isStation && stationId) {
    const [station, todayIdx, monthVers, lastAlert] = await Promise.all([
      db.station.findUnique({ where: { id: stationId }, select: { name: true } }),
      db.dailyIndex.count({ where: { stationId, date: { gte: new Date(today.toDateString()) } } }),
      db.versement.aggregate({
        _sum: { amount: true },
        where: { stationId, createdAt: { gte: startOfMonth } },
      }),
      db.alert.findFirst({
        where: { stationId, read: false },
        orderBy: { createdAt: "desc" },
        select: { message: true, level: true },
      }),
    ]);
    stationData = {
      stationName: station?.name ?? "",
      todayIndexCount: todayIdx,
      monthVersTotal: Number(monthVers._sum.amount ?? 0),
      versAttente,
      lastAlert,
    };
  }

  // ── Commercial pipeline (DC, DG, DF, Admin) ───────────────────────────────
  let commercial: {
    budgetPending: number;
    proposalPendingDG: number;
    bcBrouillon: number;
    bcEnvoye: number;
    bcOffreRecue: number;
    bcPaye: number;
    bcLivre: number;
    bcTotal: number;
    lastBCs: { id: string; number: string; status: string; createdAt: Date }[];
  } | null = null;

  if (["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"].includes(role)) {
    const [bReq, prop, bcStats, lastBCs] = await Promise.all([
      db.budgetRequest.count({ where: { status: "EN_ATTENTE" } }),
      db.purchaseProposal.count({ where: { status: "EN_ATTENTE" } }),
      db.sIROrder.groupBy({ by: ["status"], _count: { _all: true } }),
      db.sIROrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, number: true, status: true, createdAt: true },
      }),
    ]);
    const byStatus = Object.fromEntries(bcStats.map((s) => [s.status, s._count._all]));
    commercial = {
      budgetPending: bReq,
      proposalPendingDG: prop,
      bcBrouillon: byStatus["BROUILLON"] ?? 0,
      bcEnvoye: byStatus["ENVOYE"] ?? 0,
      bcOffreRecue: byStatus["OFFRE_RECUE"] ?? 0,
      bcPaye: byStatus["PAYE"] ?? 0,
      bcLivre: byStatus["LIVRE"] ?? 0,
      bcTotal: Object.values(byStatus).reduce((a, b) => a + b, 0),
      lastBCs,
    };
  }

  // ── GESTOCI stock (DC, DG, Admin) ─────────────────────────────────────────
  let gestoci: { fuel: { name: string; code: string }; balance: number }[] | null = null;

  if (["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_GENERALE"].includes(role)) {
    const [fuels, entries, withdrawals] = await Promise.all([
      db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
      db.gESTOCIEntry.groupBy({ by: ["fuelId"], _sum: { quantityM15: true } }),
      db.gESTOCIWithdrawalItem.groupBy({ by: ["fuelId"], _sum: { quantityM15: true } }),
    ]);
    const entered = Object.fromEntries(entries.map((e) => [e.fuelId, Number(e._sum.quantityM15 ?? 0)]));
    const withdrawn = Object.fromEntries(withdrawals.map((w) => [w.fuelId, Number(w._sum.quantityM15 ?? 0)]));
    gestoci = fuels.map((f) => ({
      fuel: f,
      balance: (entered[f.id] ?? 0) - (withdrawn[f.id] ?? 0),
    })).filter((g) => g.balance !== 0 || (entered[g.fuel.id] ?? 0) > 0);
  }

  // ── Financial (DF, DG, Admin) ─────────────────────────────────────────────
  let finance: {
    monthVersTotal: number;
    monthVersCount: number;
    versAttente: number;
    versByStation: { stationId: string; stationName: string; total: number }[];
    sirPaymentsPending: { number: string; amount: number }[];
  } | null = null;

  if (["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"].includes(role)) {
    const [monthVers, stationVers, alertsRecent] = await Promise.all([
      db.versement.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
      db.versement.groupBy({
        by: ["stationId"],
        _sum: { amount: true },
        where: { createdAt: { gte: startOfMonth } },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
      db.sIROrder.findMany({
        where: { status: { in: ["ENVOYE", "OFFRE_RECUE"] } },
        select: { number: true, items: { select: { totalAmount: true } } },
        take: 5,
      }),
    ]);
    const stationNames = await db.station.findMany({
      where: { id: { in: stationVers.map((s) => s.stationId) } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(stationNames.map((s) => [s.id, s.name]));
    finance = {
      monthVersTotal: Number(monthVers._sum.amount ?? 0),
      monthVersCount: monthVers._count._all,
      versAttente,
      versByStation: stationVers.map((s) => ({
        stationId: s.stationId,
        stationName: nameMap[s.stationId] ?? "—",
        total: Number(s._sum.amount ?? 0),
      })),
      sirPaymentsPending: alertsRecent.map((o) => ({
        number: o.number,
        amount: o.items.reduce((sum, i) => sum + Number(i.totalAmount), 0),
      })),
    };
  }

  // ── Admin global ──────────────────────────────────────────────────────────
  let admin: { stationCount: number; userCount: number; fuelCount: number } | null = null;
  if (role === "ADMIN") {
    const [stationCount, userCount, fuelCount] = await Promise.all([
      db.station.count({ where: { status: "ACTIVE" } }),
      db.user.count({ where: { active: true } }),
      db.fuel.count({ where: { active: true } }),
    ]);
    admin = { stationCount, userCount, fuelCount };
  }

  // ── Recent alerts ─────────────────────────────────────────────────────────
  const recentAlerts = await db.alert.findMany({
    where: { read: false, ...(stationId && isStation ? { stationId } : {}) },
    include: { station: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // ── Recent audit logs (DG, Admin) ─────────────────────────────────────────
  let recentActivity: { id: string; createdAt: Date; action: string; entity: string; after: any; user: { name: string; role: string } | null }[] = [];
  if (["ADMIN", "DIRECTION_GENERALE"].includes(role)) {
    recentActivity = await db.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }) as any;
  }

  return { alertCount, versAttente, stationData, commercial, gestoci, finance, admin, recentAlerts, recentActivity };
}

const BC_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  BROUILLON:    { label: "Brouillon",     color: "text-slate-500",  dot: "bg-slate-400" },
  ENVOYE:       { label: "Envoyé SIR",    color: "text-blue-600",   dot: "bg-blue-500" },
  OFFRE_RECUE:  { label: "Offre reçue",   color: "text-violet-600", dot: "bg-violet-500" },
  PAYE:         { label: "Payé",          color: "text-amber-600",  dot: "bg-amber-500" },
  LIVRE:        { label: "Livré",         color: "text-emerald-600",dot: "bg-emerald-500" },
  ANNULE:       { label: "Annulé",        color: "text-red-500",    dot: "bg-red-400" },
};

export default async function DashboardPage() {
  const session = await requireAuth();
  const user = session.user as any;
  const role: Role = user.role;
  const data = await getDashboardData(role, user.id, user.stationId);

  const isGerant = role === "GERANT";
  const isDC = role === "DIRECTION_COMMERCIALE";
  const isDF = role === "DIRECTION_FINANCIERE";
  const isDG = role === "DIRECTION_GENERALE";
  const isAdmin = role === "ADMIN";

  return (
    <div className="space-y-5">

      {/* ── Titre page ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          {isGerant && data.stationData ? `Station ${data.stationData.stationName}` : "Tableau de bord"}
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {new Date().toLocaleDateString("fr-CI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GÉRANT — vue station
      ══════════════════════════════════════════════════════════════════════ */}
      {isGerant && data.stationData && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard title="Index saisis auj." value={data.stationData.todayIndexCount} suffix="relevés" icon={Gauge} color="blue" href="/dashboard/gerant/index" />
            <KpiCard title="Versements (mois)" value={data.stationData.monthVersTotal} suffix="FCFA" icon={ArrowUpCircle} color="emerald" href="/dashboard/gerant/versements" money />
            <KpiCard title="En attente valid." value={data.stationData.versAttente} suffix="versements" icon={Clock} color={data.stationData.versAttente > 0 ? "amber" : "emerald"} href="/dashboard/gerant/versements" />
            <KpiCard title="Alertes actives" value={data.alertCount} suffix="alertes" icon={AlertTriangle} color={data.alertCount > 0 ? "red" : "emerald"} href="/dashboard/alertes" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickLink href="/dashboard/gerant/index" icon={Gauge} label="Saisir index" desc="Relevé pompes du jour" color="blue" />
            <QuickLink href="/dashboard/gerant/stocks" icon={Droplets} label="Stocks cuves" desc="Mouvements carburant" color="orange" />
            <QuickLink href="/dashboard/gerant/livraisons" icon={Package} label="Livraisons" desc="Réceptions carburant" color="violet" />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DIRECTION COMMERCIALE
      ══════════════════════════════════════════════════════════════════════ */}
      {isDC && data.commercial && (
        <>
          {/* Pipeline workflow */}
          <Section title="Pipeline Commercial SIR" href="/dashboard/commercial/sir-orders" icon={ShoppingCart}>
            <WorkflowStrip commercial={data.commercial} />
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Actions en attente */}
            <Section title="Actions requises" icon={TriangleAlert}>
              <div className="divide-y divide-slate-50">
                <ActionRow
                  href="/dashboard/commercial/budget"
                  icon={Landmark}
                  label={`${data.commercial.budgetPending} demande${data.commercial.budgetPending !== 1 ? "s" : ""} de budget en attente DF`}
                  count={data.commercial.budgetPending}
                  active={data.commercial.budgetPending > 0}
                />
                <ActionRow
                  href="/dashboard/commercial/propositions"
                  icon={FileText}
                  label={`${data.commercial.proposalPendingDG} proposition${data.commercial.proposalPendingDG !== 1 ? "s" : ""} en attente DG`}
                  count={data.commercial.proposalPendingDG}
                  active={data.commercial.proposalPendingDG > 0}
                />
                <ActionRow
                  href="/dashboard/commercial/sir-orders"
                  icon={ShoppingCart}
                  label={`${data.commercial.bcEnvoye} BC envoyé${data.commercial.bcEnvoye !== 1 ? "s" : ""} — en attente offre SIR`}
                  count={data.commercial.bcEnvoye}
                  active={data.commercial.bcEnvoye > 0}
                />
                <ActionRow
                  href="/dashboard/commercial/sir-orders"
                  icon={PackageCheck}
                  label={`${data.commercial.bcOffreRecue} BC avec offre reçue — paiement à traiter`}
                  count={data.commercial.bcOffreRecue}
                  active={data.commercial.bcOffreRecue > 0}
                />
              </div>
            </Section>

            {/* GESTOCI stocks */}
            {data.gestoci && (
              <Section title="Stocks GESTOCI" href="/dashboard/commercial/gestoci" icon={Warehouse}>
                <GESTOCIStockWidget stocks={data.gestoci} />
              </Section>
            )}
          </div>

          {/* Derniers BCs */}
          <Section title="Derniers bons de commande" href="/dashboard/commercial/sir-orders" icon={ShoppingCart}>
            <RecentBCsTable bcs={data.commercial.lastBCs} />
          </Section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DIRECTION FINANCIÈRE
      ══════════════════════════════════════════════════════════════════════ */}
      {isDF && data.finance && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard title="CA du mois" value={data.finance.monthVersTotal} suffix="FCFA" icon={TrendingUp} color="emerald" href="/dashboard/direction-financiere/versements" money />
            <KpiCard title="Versements (mois)" value={data.finance.monthVersCount} suffix="versements" icon={ArrowUpCircle} color="blue" href="/dashboard/direction-financiere/versements" />
            <KpiCard title="En attente valid." value={data.finance.versAttente} suffix="à valider" icon={Clock} color={data.finance.versAttente > 0 ? "amber" : "emerald"} href="/dashboard/direction-financiere/versements" />
            <KpiCard title="Alertes actives" value={data.alertCount} suffix="alertes" icon={AlertTriangle} color={data.alertCount > 0 ? "red" : "emerald"} href="/dashboard/alertes" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Versements par station (ce mois)" href="/dashboard/direction-financiere/versements" icon={BarChart3}>
              <div className="divide-y divide-slate-50">
                {data.finance.versByStation.length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center">Aucun versement ce mois.</p>
                )}
                {data.finance.versByStation.map((s) => (
                  <div key={s.stationId} className="flex items-center justify-between py-3 px-4">
                    <span className="text-sm text-slate-700 font-medium">{s.stationName}</span>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(s.total)} FCFA</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Budgets à communiquer" href="/dashboard/commercial/budget" icon={Landmark}>
              {data.commercial && (
                <div className="divide-y divide-slate-50">
                  <ActionRow
                    href="/dashboard/commercial/budget"
                    icon={Landmark}
                    label={`${data.commercial.budgetPending} demande${data.commercial.budgetPending !== 1 ? "s" : ""} de budget DC en attente`}
                    count={data.commercial.budgetPending}
                    active={data.commercial.budgetPending > 0}
                  />
                  <ActionRow
                    href="/dashboard/commercial/sir-orders"
                    icon={ShoppingCart}
                    label={`${data.commercial.bcPaye + data.commercial.bcLivre} BC clôturés (payés / livrés)`}
                    count={data.commercial.bcPaye + data.commercial.bcLivre}
                    active={false}
                  />
                </div>
              )}
            </Section>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DIRECTION GÉNÉRALE
      ══════════════════════════════════════════════════════════════════════ */}
      {isDG && data.commercial && data.finance && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard title="CA du mois" value={data.finance.monthVersTotal} suffix="FCFA" icon={TrendingUp} color="emerald" href="/dashboard/direction-financiere" money />
            <KpiCard title="Versements att." value={data.finance.versAttente} suffix="à valider" icon={Clock} color={data.finance.versAttente > 0 ? "amber" : "emerald"} href="/dashboard/direction-financiere/versements" />
            <KpiCard title="Propositions" value={data.commercial.proposalPendingDG} suffix="à valider" icon={FileText} color={data.commercial.proposalPendingDG > 0 ? "violet" : "emerald"} href="/dashboard/commercial/propositions" />
            <KpiCard title="Alertes" value={data.alertCount} suffix="non lues" icon={AlertTriangle} color={data.alertCount > 0 ? "red" : "emerald"} href="/dashboard/alertes" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Section title="Pipeline Commercial" href="/dashboard/commercial/sir-orders" icon={ShoppingCart}>
                <WorkflowStrip commercial={data.commercial} />
              </Section>
            </div>
            {data.gestoci && (
              <Section title="Stocks GESTOCI" href="/dashboard/commercial/gestoci" icon={Warehouse}>
                <GESTOCIStockWidget stocks={data.gestoci} />
              </Section>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="À valider — DG" icon={BadgeCheck}>
              <div className="divide-y divide-slate-50">
                <ActionRow href="/dashboard/commercial/propositions" icon={FileText} label={`${data.commercial.proposalPendingDG} proposition${data.commercial.proposalPendingDG !== 1 ? "s" : ""} d'achat en attente de validation`} count={data.commercial.proposalPendingDG} active={data.commercial.proposalPendingDG > 0} />
                <ActionRow href="/dashboard/commercial/sir-orders" icon={ShoppingCart} label={`${data.commercial.bcEnvoye} BC envoyé${data.commercial.bcEnvoye !== 1 ? "s" : ""} à la SIR`} count={data.commercial.bcEnvoye} active={data.commercial.bcEnvoye > 0} />
                <ActionRow href="/dashboard/direction-financiere/versements" icon={Wallet} label={`${data.finance.versAttente} versement${data.finance.versAttente !== 1 ? "s" : ""} en attente de validation`} count={data.finance.versAttente} active={data.finance.versAttente > 0} />
              </div>
            </Section>
            <Section title="Versements par station (ce mois)" href="/dashboard/direction-financiere/versements" icon={BarChart3}>
              <div className="divide-y divide-slate-50">
                {data.finance.versByStation.map((s) => (
                  <div key={s.stationId} className="flex items-center justify-between py-3 px-4">
                    <span className="text-sm text-slate-700 font-medium">{s.stationName}</span>
                    <span className="text-sm font-semibold tabular-nums">{fmt(s.total)} FCFA</span>
                  </div>
                ))}
                {data.finance.versByStation.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Aucun versement ce mois.</p>}
              </div>
            </Section>
          </div>

          <Section title="Activité récente des collaborateurs" href="/dashboard/direction-generale/activite" icon={Activity}>
            <RecentActivityList logs={data.recentActivity} />
          </Section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ADMIN — vue globale
      ══════════════════════════════════════════════════════════════════════ */}
      {isAdmin && data.admin && data.commercial && data.finance && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard title="Stations actives" value={data.admin.stationCount} suffix="stations" icon={Building2} color="blue" href="/dashboard/admin/stations" />
            <KpiCard title="Utilisateurs" value={data.admin.userCount} suffix="comptes" icon={Users} color="violet" href="/dashboard/admin/users" />
            <KpiCard title="CA du mois" value={data.finance.monthVersTotal} suffix="FCFA" icon={TrendingUp} color="emerald" href="/dashboard/direction-financiere" money />
            <KpiCard title="Versements att." value={data.finance.versAttente} suffix="à valider" icon={Clock} color={data.finance.versAttente > 0 ? "amber" : "emerald"} href="/dashboard/direction-financiere/versements" />
            <KpiCard title="Alertes" value={data.alertCount} suffix="non lues" icon={AlertTriangle} color={data.alertCount > 0 ? "red" : "emerald"} href="/dashboard/alertes" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Section title="Pipeline Commercial SIR" href="/dashboard/commercial/sir-orders" icon={ShoppingCart}>
                <WorkflowStrip commercial={data.commercial} />
                <RecentBCsTable bcs={data.commercial.lastBCs} />
              </Section>
            </div>
            <div className="space-y-4">
              {data.gestoci && (
                <Section title="Stocks GESTOCI" href="/dashboard/commercial/gestoci" icon={Warehouse}>
                  <GESTOCIStockWidget stocks={data.gestoci} />
                </Section>
              )}
              <Section title="À traiter" icon={TriangleAlert}>
                <div className="divide-y divide-slate-50">
                  <ActionRow href="/dashboard/commercial/budget" icon={Landmark} label={`${data.commercial.budgetPending} demande${data.commercial.budgetPending !== 1 ? "s" : ""} budget`} count={data.commercial.budgetPending} active={data.commercial.budgetPending > 0} />
                  <ActionRow href="/dashboard/commercial/propositions" icon={FileText} label={`${data.commercial.proposalPendingDG} proposition${data.commercial.proposalPendingDG !== 1 ? "s" : ""} DG`} count={data.commercial.proposalPendingDG} active={data.commercial.proposalPendingDG > 0} />
                  <ActionRow href="/dashboard/direction-financiere/versements" icon={Wallet} label={`${data.finance.versAttente} versement${data.finance.versAttente !== 1 ? "s" : ""} att.`} count={data.finance.versAttente} active={data.finance.versAttente > 0} />
                </div>
              </Section>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Versements par station (ce mois)" href="/dashboard/direction-financiere/versements" icon={BarChart3}>
              <div className="divide-y divide-slate-50">
                {data.finance.versByStation.map((s) => (
                  <div key={s.stationId} className="flex items-center justify-between py-3 px-4">
                    <span className="text-sm text-slate-700 font-medium">{s.stationName}</span>
                    <span className="text-sm font-semibold tabular-nums">{fmt(s.total)} FCFA</span>
                  </div>
                ))}
                {data.finance.versByStation.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Aucun versement ce mois.</p>}
              </div>
            </Section>
            <Section title="Alertes récentes" href="/dashboard/alertes" icon={AlertTriangle}>
              <AlertsList alerts={data.recentAlerts} />
            </Section>
          </div>

          <Section title="Activité récente des collaborateurs" href="/dashboard/direction-generale/activite" icon={Activity}>
            <RecentActivityList logs={data.recentActivity} />
          </Section>
        </>
      )}

      {/* ── Alertes (commun pour non-admin) ────────────────────────────────── */}
      {!isAdmin && data.recentAlerts.length > 0 && (
        <Section title="Alertes récentes" href="/dashboard/alertes" icon={AlertTriangle}>
          <AlertsList alerts={data.recentAlerts} />
        </Section>
      )}

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title, href, icon: Icon, children,
}: {
  title: string; href?: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        {href && (
          <Link href={href} className="text-xs text-[#0369A1] font-semibold flex items-center gap-0.5 hover:underline">
            Voir tout <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  title, value, icon: Icon, color, href, suffix, money,
}: {
  title: string; value: number; icon: React.ElementType; color: string;
  href?: string; suffix: string; money?: boolean;
}) {
  const styles: Record<string, { bg: string; icon: string }> = {
    blue:    { bg: "bg-blue-50",    icon: "text-blue-600" },
    violet:  { bg: "bg-violet-50",  icon: "text-violet-600" },
    orange:  { bg: "bg-amber-50",   icon: "text-amber-600" },
    amber:   { bg: "bg-amber-50",   icon: "text-amber-600" },
    red:     { bg: "bg-red-50",     icon: "text-red-600" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600" },
  };
  const s = styles[color] || styles.blue;
  const displayVal = money ? fmtM(value) : fmt(value);

  const inner = (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{title}</p>
        <div className={`p-2 rounded-xl ${s.bg}`}>
          <Icon className={`w-4 h-4 ${s.icon}`} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">{displayVal}</p>
        <p className="text-[11px] text-slate-400 mt-1">{suffix}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

function WorkflowStrip({ commercial }: { commercial: NonNullable<Awaited<ReturnType<typeof getDashboardData>>["commercial"]> }) {
  const steps = [
    { label: "Budget DC", count: commercial.budgetPending, href: "/dashboard/commercial/budget", color: "slate", active: commercial.budgetPending > 0 },
    { label: "Prop. DG", count: commercial.proposalPendingDG, href: "/dashboard/commercial/propositions", color: "violet", active: commercial.proposalPendingDG > 0 },
    { label: "BC Brouillon", count: commercial.bcBrouillon, href: "/dashboard/commercial/sir-orders", color: "slate", active: commercial.bcBrouillon > 0 },
    { label: "Envoyé SIR", count: commercial.bcEnvoye, href: "/dashboard/commercial/sir-orders", color: "blue", active: commercial.bcEnvoye > 0 },
    { label: "Offre reçue", count: commercial.bcOffreRecue, href: "/dashboard/commercial/sir-orders", color: "violet", active: commercial.bcOffreRecue > 0 },
    { label: "Payé", count: commercial.bcPaye, href: "/dashboard/commercial/sir-orders", color: "amber", active: false },
    { label: "Livré", count: commercial.bcLivre, href: "/dashboard/commercial/sir-orders", color: "emerald", active: false },
  ];
  const colorMap: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className="flex gap-2 px-5 py-4 overflow-x-auto">
      {steps.map((step, i) => (
        <Link key={i} href={step.href} className={`flex flex-col items-center gap-1.5 min-w-[80px] px-3 py-2 rounded-xl border transition-all hover:shadow-sm ${step.active ? "border-current shadow-sm" : "border-slate-100"}`}>
          <span className={`text-xl font-extrabold tabular-nums ${step.count > 0 ? colorMap[step.color].split(" ")[1] : "text-slate-300"}`}>
            {step.count}
          </span>
          <span className="text-[10px] text-slate-500 text-center leading-tight font-medium">{step.label}</span>
          {step.active && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        </Link>
      ))}
    </div>
  );
}

function RecentBCsTable({ bcs }: { bcs: { id: string; number: string; status: string; createdAt: Date }[] }) {
  return (
    <div className="divide-y divide-slate-50">
      {bcs.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Aucun bon de commande.</p>}
      {bcs.map((bc) => {
        const st = BC_STATUS[bc.status] ?? { label: bc.status, color: "text-slate-400", dot: "bg-slate-300" };
        return (
          <Link key={bc.id} href={`/dashboard/commercial/sir-orders/${bc.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
              <span className="text-sm font-mono font-medium text-slate-700">{bc.number}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
              <span className="text-[11px] text-slate-400">
                {new Date(bc.createdAt).toLocaleDateString("fr-CI", { day: "2-digit", month: "short" })}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function GESTOCIStockWidget({ stocks }: { stocks: { fuel: { name: string; code: string }; balance: number }[] }) {
  if (stocks.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center px-4">Aucun stock enregistré.</p>;
  }
  return (
    <div className="divide-y divide-slate-50">
      {stocks.map((s, i) => {
        const level = s.balance <= 0 ? "red" : s.balance < 20000 ? "amber" : "emerald";
        const barPct = Math.min(100, Math.max(0, (s.balance / 500000) * 100));
        return (
          <div key={i} className="px-5 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{s.fuel.code}</span>
                <span className="text-sm font-medium text-slate-700">{s.fuel.name}</span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${level === "red" ? "text-red-600" : level === "amber" ? "text-amber-600" : "text-emerald-700"}`}>
                {fmt(s.balance)} L
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${level === "red" ? "bg-red-400" : level === "amber" ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionRow({
  href, icon: Icon, label, count, active,
}: { href: string; icon: React.ElementType; label: string; count: number; active: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
      <div className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${active ? "bg-amber-50" : "bg-slate-50"}`}>
        <Icon className={`w-3.5 h-3.5 ${active ? "text-amber-600" : "text-slate-400"}`} />
      </div>
      <span className={`text-sm flex-1 ${active ? "font-semibold text-slate-800" : "text-slate-500"}`}>{label}</span>
      {active && count > 0 && (
        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{count}</span>
      )}
      <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
    </Link>
  );
}

function QuickLink({ href, icon: Icon, label, desc, color }: { href: string; icon: React.ElementType; label: string; desc: string; color: string }) {
  const c: Record<string, string> = { blue: "bg-blue-50 text-blue-600", orange: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600", emerald: "bg-emerald-50 text-emerald-600" };
  return (
    <Link href={href} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-xl ${c[color]}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
    </Link>
  );
}

const ACTION_DISPLAY: Record<string, { label: string; color: string }> = {
  CREATE: { label: "Créé", color: "text-blue-600 bg-blue-50" },
  UPDATE: { label: "Modifié", color: "text-amber-600 bg-amber-50" },
  DELETE: { label: "Supprimé", color: "text-red-600 bg-red-50" },
  VALIDATE: { label: "Validé", color: "text-emerald-600 bg-emerald-50" },
  REJECT: { label: "Rejeté", color: "text-red-600 bg-red-50" },
  SEND: { label: "Envoyé", color: "text-purple-600 bg-purple-50" },
  RECORD_OFFER: { label: "Offre saisie", color: "text-indigo-600 bg-indigo-50" },
  RECORD_PAYMENT: { label: "Paiement", color: "text-emerald-600 bg-emerald-50" },
  RECORD_DELIVERY: { label: "Livraison", color: "text-teal-600 bg-teal-50" },
  RECORD_READING: { label: "Relevé GESTOCI", color: "text-violet-600 bg-violet-50" },
};
const ENTITY_SHORT: Record<string, string> = {
  BudgetRequest: "Demande budget", BudgetAllocation: "Budget accordé",
  PurchaseProposal: "Proposition", SIROrder: "BC", SIROffer: "Offre SIR",
  SIRPayment: "Paiement", SIRDeliveryOrder: "Livraison SIR",
  GESTOCIWithdrawal: "BL IVORY", GESTOCIStockReading: "Relevé GESTOCI",
};
const ROLE_SHORT: Record<string, string> = {
  ADMIN: "Admin", DIRECTION_COMMERCIALE: "DC", DIRECTION_FINANCIERE: "DF",
  DIRECTION_GENERALE: "DG", GERANT: "Gérant",
};

function RecentActivityList({ logs }: { logs: { id: string; createdAt: Date; action: string; entity: string; after: any; user: { name: string; role: string } | null }[] }) {
  if (logs.length === 0) return <p className="text-sm text-slate-400 py-6 text-center">Aucune activité enregistrée.</p>;
  return (
    <div className="divide-y divide-slate-50">
      {logs.map((log) => {
        const ad = ACTION_DISPLAY[log.action] ?? { label: log.action, color: "text-slate-600 bg-slate-50" };
        const meta = log.after?.number || log.after?.blNumber || log.after?.reference || "";
        return (
          <div key={log.id} className="flex items-center gap-3 px-5 py-3">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${ad.color}`}>{ad.label}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-slate-700">{ENTITY_SHORT[log.entity] ?? log.entity}</span>
              {meta && <span className="text-xs text-slate-400 ml-1 font-mono">{meta}</span>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-medium text-slate-600">{log.user?.name ?? "Système"}</p>
              <p className="text-[10px] text-slate-400">{ROLE_SHORT[log.user?.role ?? ""] ?? ""} · {new Date(log.createdAt).toLocaleTimeString("fr-CI", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlertsList({ alerts }: { alerts: { id: string; message: string; level: string; createdAt: Date; station?: { name: string } | null }[] }) {
  if (alerts.length === 0) return <p className="text-sm text-slate-400 py-6 text-center">Aucune alerte non lue.</p>;
  return (
    <div className="divide-y divide-slate-50">
      {alerts.map((a) => (
        <div key={a.id} className="flex items-start gap-3 px-5 py-3">
          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${a.level === "RED" ? "bg-red-500" : a.level === "ORANGE" ? "bg-orange-400" : "bg-blue-400"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">{a.message}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{a.station?.name}</p>
          </div>
          <span className="text-[10px] text-slate-300 flex-shrink-0 mt-0.5">
            {new Date(a.createdAt).toLocaleDateString("fr-CI", { day: "numeric", month: "short" })}
          </span>
        </div>
      ))}
    </div>
  );
}
