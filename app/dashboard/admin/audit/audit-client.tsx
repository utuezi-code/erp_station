"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Log {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  before: any;
  after: any;
  ipAddress: string | null;
  createdAt: string | Date;
  user: { name: string | null; email: string | null } | null;
}

interface Props {
  logs: Log[];
  users: { id: string; name: string | null; email: string | null }[];
  entities: string[];
  total: number;
  page: number;
  pageSize: number;
  filters: { userId: string; entity: string };
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  VALIDATE: "bg-orange-100 text-orange-700",
  REJECT: "bg-red-100 text-red-700",
};

export function AuditClient({ logs, users, entities, total, page, pageSize, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const totalPages = Math.ceil(total / pageSize);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams();
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.entity) params.set("entity", filters.entity);
    params.set("page", "1");
    params.set(key, value);
    if (!value) params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function goPage(p: number) {
    const params = new URLSearchParams();
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.entity) params.set("entity", filters.entity);
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Utilisateur</label>
          <select
            value={filters.userId}
            onChange={(e) => updateParams("userId", e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          >
            <option value="">Tous les utilisateurs</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Entité</label>
          <select
            value={filters.entity}
            onChange={(e) => updateParams("entity", e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          >
            <option value="">Toutes les entités</option>
            {entities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => router.push(pathname)}
            className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
                <th className="text-left px-5 py-3">Date & heure</th>
                <th className="text-left px-5 py-3">Utilisateur</th>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">Entité</th>
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-5 py-3">IP</th>
                <th className="text-left px-5 py-3">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-300 text-sm">
                    Aucune action enregistrée
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("fr-CI")}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800 text-xs">{log.user?.name || "Système"}</p>
                      <p className="text-gray-400 text-[11px]">{log.user?.email || ""}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-gray-700">{log.entity}</td>
                    <td className="px-5 py-3 text-xs text-gray-400 font-mono">{log.entityId.slice(-8)}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{log.ipAddress || "—"}</td>
                    <td className="px-5 py-3 max-w-xs">
                      {log.after && (
                        <details className="text-xs text-gray-400 cursor-pointer">
                          <summary className="hover:text-gray-600">Voir</summary>
                          <pre className="mt-1 text-[10px] bg-gray-50 p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(log.after, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} sur {total} résultats
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => goPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      p === page ? "bg-orange-500 text-white" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => goPage(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
