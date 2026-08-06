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
  step: "DC" | "DF" | "DG";
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

  const config = {
    DC: {
      title: "Validation Direction Commerciale",
      color: "border-orange-200 bg-orange-50",
      titleColor: "text-orange-800",
      desc: "Votre validation transmettra la demande à la Direction Financière.",
      btnLabel: "Valider — transmettre à la DF",
    },
    DF: {
      title: "Validation Direction Financière",
      color: "border-blue-200 bg-blue-50",
      titleColor: "text-blue-800",
      desc: "Votre validation transmettra la demande à la Direction Générale.",
      btnLabel: "Valider — transmettre à la DG",
    },
    DG: {
      title: "Validation Direction Générale",
      color: "border-purple-200 bg-purple-50",
      titleColor: "text-purple-800",
      desc: "Votre validation autorise la création du bon de commande.",
      btnLabel: "Approuver définitivement",
    },
  }[step];

  return (
    <Card className={config.color}>
      <CardHeader>
        <CardTitle className={`text-sm ${config.titleColor}`}>{config.title}</CardTitle>
        <p className="text-xs text-gray-500">{config.desc}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Commentaire (optionnel)</Label>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Motif de validation ou d'éventuelles réserves..." />
        </div>
        {canValidate && (
          <Button className="w-full bg-green-600 hover:bg-green-700" disabled={loading} onClick={() => handle(true)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {config.btnLabel}
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
