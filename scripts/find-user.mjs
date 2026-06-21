// One-off read-only lookup: find a profile by email and report whether Google
// is connected (without exposing the encrypted token). Run:
//   node --env-file=.env.local scripts/find-user.mjs <email>
import postgres from "postgres";

const email = process.argv[2];
if (!email) {
  console.error("usage: node scripts/find-user.mjs <email>");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const rows = await sql`
    select id, email, name, created_at,
           (google_refresh_token_enc is not null) as google_connected
    from profiles
    where lower(email) = lower(${email})`;

  if (rows.length === 0) {
    console.log(`No profile found for ${email}`);
  } else {
    for (const r of rows) {
      console.log(JSON.stringify(r));
      const [assignments] = await sql`
        select count(*)::int as n
        from chore_assignments ca
        join chores c on c.id = ca.chore_id and c.active = true
        where ca.user_id = ${r.id}`;
      const [links] = await sql`
        select count(*)::int as n from calendar_links where user_id = ${r.id}`;
      console.log(`  active assigned chores: ${assignments.n}, existing calendar_links: ${links.n}`);
    }
  }
} finally {
  await sql.end();
}
