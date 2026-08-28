import { db } from "@/lib/db";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VALIDATE"
  | "REJECT"
  | "SEND"
  | "RECORD_OFFER"
  | "RECORD_PAYMENT"
  | "RECORD_DELIVERY"
  | "RECORD_READING"
  | "IMPORT";

interface AuditParams {
  userId?: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  before?: object;
  after?: object;
  ipAddress?: string;
  meta?: object;
}

export async function writeAuditLog(params: AuditParams) {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      before: params.before as any,
      after: { ...(params.after as any), ...(params.meta as any) } as any,
      ipAddress: params.ipAddress,
    },
  });
}
