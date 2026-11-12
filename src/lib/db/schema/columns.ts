import { timestamp } from "drizzle-orm/pg-core";

/** Every time column is timestamptz, stored in UTC. */
export function utc(name: string) {
  return timestamp(name, { withTimezone: true, mode: "date" });
}

/** createdAt / updatedAt for every table. Call per table so builders aren't shared. */
export function timestamps() {
  return {
    createdAt: utc("created_at").notNull().defaultNow(),
    updatedAt: utc("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  };
}
