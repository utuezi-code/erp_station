"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updateOrderStatus } from "../actions";

const TRANSITIONS: Record<string, { next: string; label: string; variant: string }[]> = {
  BROUILLON: [
    { next: "EN_ATTENTE_VALIDATION", label: "Soumettre validation", variant: "orange" },
    { next: "ANNULE", label: "Annuler", variant: "red" },
  ],
  EN_ATTENTE_VALIDATION: [
    { next: "VALIDE", label: "Valider", variant: "purple" },
    { next: "ANNULE", label: "Rejeter", variant: "red" },
  ],
  VALIDE: [
    { next: "ENVOYE_FOURNISSEUR", label: "Marquer envoyé", variant: "blue" },
  ],
  ENVOYE_FOURNISSEUR: [
    { next: "EN_PREPARATION", label: "En préparation", variant: "orange" },
    { next: "EXPEDIE", label: "Marquer expédié", variant: "teal" },
  ],
  EN_PREPARATION: [
    { next: "EXPEDIE", label: "Marquer expédié", variant: "teal" },
  ],
  EXPEDIE: [
    { next: "LIVRE_PARTIELLEMENT", label: "Réception partielle", variant: "orange" },
    { next: "LIVRE_TOTALEMENT", label: "Livraison totale", variant: "green" },
  ],
  LIVRE_PARTIELLEMENT: [
    { next: "LIVRE_TOTALEMENT", label: "Livraison totale", variant: "green" },
  ],
  LIVRE_TOTALEMENT: [
    { next: "CLOTURE", label: "Clôturer", variant: "gray" },
  ],
};

const COLORS: Record<string, string> = {
  orange: "bg-orange-500 hover:bg-orange-600 text-white",
  blue: "bg-blue-500 hover:bg-blue-600 text-white",
  green: "bg-green-600 hover:bg-green-700 text-white",
  purple: "bg-purple-600 hover:bg-purple-700 text-white",
  teal: "bg-teal-600 hover:bg-teal-700 text-white",
  red: "border-red-300 text-red-600 hover:bg-red-50",
  gray: "border-gray-300 text-gray-600 hover:bg-gray-50",
};

export function OrderStatusActions({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const transitions = TRANSITIONS[currentStatus] || [];
  if (transitions.length === 0) return null;

  async function handle(nextStatus: string) {
    setLoading(true);
    try {
      await updateOrderStatus(orderId, nextStatus);
      toast.success("Statut mis à jour.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {transitions.map((t) => (
          <Button
            key={t.next}
            className={`w-full ${COLORS[t.variant]}`}
            variant={["red", "gray"].includes(t.variant) ? "outline" : "default"}
            disabled={loading}
            onClick={() => handle(t.next)}
          >
            {t.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
