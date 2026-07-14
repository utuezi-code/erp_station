import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { FacturesClient } from "./factures-client";

export default async function FacturesPage() {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const [invoices, suppliers] = await Promise.all([
    db.supplierInvoice.findMany({
      include: {
        supplier: { select: { name: true } },
        order: { select: { number: true } },
      },
      orderBy: { invoiceDate: "desc" },
    }),
    db.supplier.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalTTC = invoices.reduce((s, i) => s + Number(i.amountTTC), 0);
  const totalPaid = invoices.filter((i) => i.paid).reduce((s, i) => s + Number(i.amountTTC), 0);
  const totalPending = totalTTC - totalPaid;
  const overdueCount = invoices.filter(
    (i) => !i.paid && i.dueDate && new Date(i.dueDate) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Factures fournisseurs</h2>
          <p className="text-sm text-gray-400 mt-0.5">{invoices.length} facture(s) enregistrée(s)</p>
        </div>
        <Link
          href="/dashboard/achats/factures/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#0369A1] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-orange-400/20"
        >
          <Plus className="w-4 h-4" /> Nouvelle facture
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total facturé", value: totalTTC, icon: FileText, color: "text-blue-500 bg-blue-50" },
          { label: "Payé", value: totalPaid, icon: CheckCircle2, color: "text-green-500 bg-green-50" },
          { label: "Reste à payer", value: totalPending, icon: Clock, color: "text-orange-500 bg-orange-50" },
          { label: "En retard", value: overdueCount, icon: AlertCircle, color: "text-red-500 bg-red-50", isCount: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {kpi.isCount
                    ? kpi.value
                    : new Intl.NumberFormat("fr-CI").format(kpi.value) + " F"}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${kpi.color.split(" ")[1]}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color.split(" ")[0]}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <FacturesClient invoices={invoices as any} suppliers={suppliers} />
    </div>
  );
}
