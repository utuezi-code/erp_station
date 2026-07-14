import { Decimal } from "@prisma/client/runtime/library";

/**
 * Converts all Prisma Decimal and Date objects to plain JS types
 * so Next.js can serialize Server Component props for Client Components.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (value instanceof Decimal) return Number(value);
      if (value instanceof Date) return value.toISOString();
      return value;
    })
  );
}
