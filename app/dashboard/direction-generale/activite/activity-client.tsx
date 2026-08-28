"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type AuditLog = {
  id: string;
  createdAt: string;
  userId: string | null;
  user: { id: string; name: string; role: string } | null;
  entity: string;
  entityId: string;
  action: string;
  after: any;
};

type User = { id: string; name: string; role: string };

const ENTITY_LABELS: Record<string, string> = {
  BudgetRequest: "Demande budget",
  BudgetAllocation: "Allocation budget",
  PurchaseProposal: "Proposition d'achat",
  SIROrder: "Bon de commande",
  SIROffer: "Offre SIR",
  SIRPayment: "Paiement SIR",
  SIRDeliveryOrder: "Bon de livraison SIR",
  GESTOCIWithdrawal: "BL IVORY",
  GESTOCIStockReading: "Relevé GESTOCI",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE: { label: "Création", color: "bg-blue-100 text-blue-700" },
  UPDATE: { label: "Modification", color: "bg-amber-100 text-amber-700" },
  DELETE: { label: "Suppression", color: "bg-red-100 text-red-700" },
  VALIDATE: { label: "Validation", color: "bg-emerald-100 text-emerald-700" },
  REJECT: { label: "Rejet", color: "bg-red-100 text-red-700" },
  SEND: { label: "Envoi", color: "bg-purple-100 text-purple-700" },
  RECORD_OFFER: { label: "Offre saisie", color: "bg-indigo-100 text-indigo-700" },
  RECORD_PAYMENT: { label: "Paiement enregistré", color: "bg-emerald-100 text-emerald-700" },
  RECORD_DELIVERY: { label: "Livraison enregistrée", color: "bg-teal-100 text-teal-700" },
  RECORD_READING: { label: "Relevé GESTOCI", color: "bg-violet-100 text-violet-700" },
  IMPORT: { label: "Import", color: "bg-gray-100 text-gray-700" },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  DIRECTION_COMMERCIALE: "Dir. Commerciale",
  DIRECTION_FINANCIERE: "Dir. Financière",
  DIRECTION_GENERALE: "Dir. Générale",
  GERANT: "Gérant",
};

function getMeta(log: AuditLog): string {
  const m = log.after || {};
  const parts: string[] = [];
  if (m.number) parts.push(m.number);
  if (m.blNumber) parts.push(`BL: ${m.blNumber}`);
  if (m.destination) parts.push(m.destination);
  if (m.totalAmount) parts.push(`${Number(m.totalAmount).toLocaleString("fr-CI")} FCFA`);
  if (m.amount) parts.push(`${Number(m.amount).toLocaleString("fr-CI")} FCFA`);
  if (m.checkNumber) parts.push(`Chèque: ${m.checkNumber}`);
  if (m.offerNumber) parts.push(`Offre: ${m.offerNumber}`);
  if (m.reference) parts.push(m.reference);
  if (m.reason) parts.push(`Motif: ${m.reason}`);
  return parts.join(" · ");
}

export function ActivityClient({
  logs,
  total,
  page,
  limit,
  users,
  filters,
}: {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  users: User[];
  filters: { userId?: string; entity?: string; action?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  function updateFilter(key: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value); else sp.delete(key);
    sp.delete("page");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  function setPage(p: number) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("page", String(p));
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  const totalPages = Math.ceil(total / limit);

  // Group logs by date
  const grouped: { date: string; logs: AuditLog[] }[] = [];
  for (const log of logs) {
    const date = new Date(log.createdAt).toLocaleDateString("fr-CI", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.logs.push(log);
    else grouped.push({ date, logs: [log] });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Journal d'activité</h1>
        <p className="text-sm text-slate-500 mt-1">{total} action{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Collaborateur</label>
          <select
            value={filters.userId || ""}
            onChange={(e) => updateFilter("userId", e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="">Tous</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role] || u.role})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Module</label>
          <select
            value={filters.entity || ""}
            onChange={(e) => updateFilter("entity", e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="">Tous</option>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Action</label>
          <select
            value={filters.action || ""}
            onChange={(e) => updateFilter("action", e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="">Toutes</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucune activité pour ces filtres.</div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ date, logs: dayLogs }) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{date}</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="space-y-2">
                {dayLogs.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-100 text-gray-700" };
                  const meta = getMeta(log);
                  const isExpanded = expanded === log.id;
                  return (
                    <div
                      key={log.id}
                      className="flex gap-4 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : log.id)}
                    >
                      {/* Time */}
                      <div className="w-14 shrink-0 text-right">
                        <span className="text-xs text-slate-400 tabular-nums">
                          {new Date(log.createdAt).toLocaleTimeString("fr-CI", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Dot */}
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-slate-400 mt-1" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionInfo.color}`}>
                            {actionInfo.label}
                          </span>
                          <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                            {ENTITY_LABELS[log.entity] || log.entity}
                          </span>
                          {meta && <span className="text-xs text-slate-500 truncate">{meta}</span>}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {log.user ? (
                              <>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{log.user.name}</span>
                                {" · "}
                                <span>{ROLE_LABELS[log.user.role] || log.user.role}</span>
                              </>
                            ) : "Système"}
                          </span>
                        </div>
                        {isExpanded && log.after && Object.keys(log.after).length > 0 && (
                          <pre className="mt-2 text-xs bg-slate-50 dark:bg-slate-900 rounded-lg p-2 overflow-x-auto text-slate-600 dark:text-slate-400">
                            {JSON.stringify(log.after, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ← Précédent
          </button>
          <span className="px-3 py-1.5 text-sm text-slate-500">Page {page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
