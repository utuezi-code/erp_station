"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateOrderStatus } from "../actions";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const TRANSITIONS: Record<string, { next: string; label: string; variant: string; needsComment?: boolean }[]> = {
  BROUILLON: [
    { next: "EN_ATTENTE_VALIDATION", label: "Soumettre à validation", variant: "orange" },
    { next: "ANNULE", label: "Annuler", variant: "red" },
  ],
  EN_ATTENTE_VALIDATION: [
    { next: "VALIDE", label: "Valider", variant: "purple", needsComment: true },
    { next: "ANNULE", label: "Rejeter", variant: "red", needsComment: true },
  ],
  VALIDE: [
    { next: "ENVOYE_FOURNISSEUR", label: "Marquer envoyé fournisseur", variant: "blue" },
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
  orange: "bg-[#0369A1] hover:bg-blue-700 text-white",
  blue: "bg-blue-500 hover:bg-blue-600 text-white",
  green: "bg-green-600 hover:bg-green-700 text-white",
  purple: "bg-purple-600 hover:bg-purple-700 text-white",
  teal: "bg-teal-600 hover:bg-teal-700 text-white",
  red: "border-red-300 text-red-600 hover:bg-red-50",
  gray: "border-gray-300 text-gray-600 hover:bg-gray-50",
};

interface Validation {
  id: string;
  action: string;
  comment: string | null;
  createdAt: string;
  user: { name: string | null };
}

export function OrderStatusActions({
  orderId,
  currentStatus,
  totalHT,
  validations = [],
}: {
  orderId: string;
  currentStatus: string;
  totalHT: number;
  validations?: Validation[];
}) {
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingNext, setPendingNext] = useState<string | null>(null);

  const transitions = TRANSITIONS[currentStatus] || [];
  const needsComment = transitions.some((t) => t.needsComment);

  async function handle(nextStatus: string) {
    setLoading(true);
    const result = await updateOrderStatus(orderId, nextStatus, comment || undefined);
    setLoading(false);
    if (result.success) {
      toast.success("Statut mis à jour.");
      setComment("");
      setPendingNext(null);
    } else {
      toast.error(result.error || "Une erreur est survenue.");
    }
  }

  if (transitions.length === 0 && validations.length === 0) return null;

  // High-value warning
  const isHighValue = totalHT > 5_000_000;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Circuit de validation</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {/* Validation history */}
        {validations.length > 0 && (
          <div className="space-y-2 pb-3 border-b">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Historique</p>
            {validations.map((v) => (
              <div key={v.id} className="flex items-start gap-2 text-xs">
                {v.action === "APPROVED"
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />}
                <div>
                  <p className="font-medium text-gray-700">{v.user.name} — {new Date(v.createdAt).toLocaleDateString("fr-CI")}</p>
                  {v.comment && <p className="text-gray-500 italic">"{v.comment}"</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* High-value warning */}
        {isHighValue && currentStatus === "EN_ATTENTE_VALIDATION" && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Commande &gt; 5 000 000 FCFA — validation Direction Financière requise.</span>
          </div>
        )}

        {/* Comment field for validation/rejection */}
        {needsComment && transitions.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Commentaire (optionnel)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Motif de validation ou de rejet..."
              className="text-sm"
            />
          </div>
        )}

        {/* Action buttons */}
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
