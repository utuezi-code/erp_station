import { requireAuth } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default async function AchatsPage() {
  await requireAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des achats</h1>
        <p className="text-gray-500 mt-1">Module 15 — Commandes & Approvisionnements</p>
      </div>
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-5 h-5" />Module achats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Gestion complète du cycle d'achat : Demande d'achat → Validation → Bon de commande →
            Livraison → Entrée en stock → Facture fournisseur → Paiement.
          </p>
          <p className="text-xs text-orange-500 mt-2">Module disponible dans le Lot 5</p>
        </CardContent>
      </Card>
    </div>
  );
}
