import type { Kysely } from "kysely";

// this is an example migration file, using kysely-ctl.
// You can copy it to your project, and adapt it to your migration process

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("email", "text", (c) => c.notNull())
    .addColumn("passwordHash", "text", (c) => c.notNull())
    .addColumn("emailVerifiedAt", "timestamptz")
    .execute();

  await db.schema
    .createTable("users_sessions")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("userId", "text", (c) =>
      c.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("expires_at", "timestamptz", (c) => c.notNull())
    .execute();

  await db.schema
    .createTable("users_email_verification_codes")
    .addColumn("id", "serial", (c) => c.primaryKey())
    .addColumn("code", "text", (c) => c.notNull())
    .addColumn("userId", "text", (c) =>
      c.notNull().unique().references("users.id").onDelete("cascade"),
    )
    .addColumn("email", "text", (c) => c.notNull())
    .addColumn("expiresAt", "timestamptz", (c) => c.notNull())
    .execute();

  await db.schema
    .createTable("users_reset_password_tokens")
    .addColumn("id", "serial", (c) => c.primaryKey())
    .addColumn("userId", "text", (c) =>
      c.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("tokenHash", "text", (c) => c.notNull())
    .addColumn("expiresAt", "timestamptz", (c) => c.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("users_reset_password_tokens").execute();
  await db.schema.dropTable("users_email_verification_codes").execute();
  await db.schema.dropTable("users_sessions").execute();
  await db.schema.dropTable("users").execute();
}
