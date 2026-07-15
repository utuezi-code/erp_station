"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { validatePurchaseRequest } from "../actions";

export function ValidateActions({
  requestId,
  canValidate,
  canReject,
  step,
}: {
  requestId: string;
  canValidate: boolean;
  canReject: boolean;
  step: "DF" | "DG";
}) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(approved: boolean) {
    setLoading(true);
    const result = await validatePurchaseRequest(requestId, approved, comment || undefined);
    setLoading(false);
    if (result.success) {
      toast.success(approved ? "Demande validée." : "Demande rejetée.");
    } else {
      toast.error(result.error || "Une erreur est survenue.");
    }
  }

  const title = step === "DF" ? "Validation Direction Financière" : "Validation Direction Générale";
  const color = step === "DF" ? "border-blue-200 bg-blue-50" : "border-purple-200 bg-purple-50";
  const titleColor = step === "DF" ? "text-blue-800" : "text-purple-800";

  return (
    <Card className={color}>
      <CardHeader>
        <CardTitle className={`text-sm ${titleColor}`}>{title}</CardTitle>
        <p className="text-xs text-gray-500">
          {step === "DF"
            ? "En tant que Direction Financière, votre validation transmettra la demande à la Direction Générale."
            : "En tant que Direction Générale, votre validation autorise la création du bon de commande."}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Commentaire (optionnel)</Label>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Motif de validation ou d'éventuelles réserves..." />
        </div>
        {canValidate && (
          <Button className="w-full bg-green-600 hover:bg-green-700" disabled={loading} onClick={() => handle(true)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {step === "DF" ? "Valider — transmettre à la DG" : "Approuver définitivement"}
          </Button>
        )}
        {canReject && (
          <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50" disabled={loading} onClick={() => handle(false)}>
            <XCircle className="w-4 h-4 mr-2" /> Rejeter la demande
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
