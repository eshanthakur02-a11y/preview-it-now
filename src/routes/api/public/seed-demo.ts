import { createFileRoute } from "@tanstack/react-router";

const DEMO_PASSWORD = "Demo@12345";
const SCHOOL_NAME = "Scholaris Demo School";

type RoleName =
  | "super_admin" | "school_admin" | "accountant" | "transport"
  | "teacher" | "student" | "parent";

type DemoUser = {
  email: string;
  role: RoleName;
  full_name: string;
  meta?: Record<string, unknown>;
};

function buildRoster(): DemoUser[] {
  const list: DemoUser[] = [
    { email: "super@demo.scholaris.app", role: "super_admin", full_name: "Sam Super" },
    { email: "admin@demo.scholaris.app", role: "school_admin", full_name: "Alex Admin" },
    { email: "accountant@demo.scholaris.app", role: "accountant", full_name: "Ada Accountant" },
    { email: "transport@demo.scholaris.app", role: "transport", full_name: "Tara Transport" },
    { email: "teacher.math@demo.scholaris.app", role: "teacher", full_name: "Mr. Math", meta: { subject: "Mathematics" } },
    { email: "teacher.sci@demo.scholaris.app", role: "teacher", full_name: "Ms. Science", meta: { subject: "Science" } },
    { email: "teacher.eng@demo.scholaris.app", role: "teacher", full_name: "Ms. English", meta: { subject: "English" } },
  ];
  for (let i = 1; i <= 15; i++) {
    list.push({ email: `student${i}@demo.scholaris.app`, role: "student", full_name: `Student ${i}` });
    list.push({ email: `parent${i}@demo.scholaris.app`, role: "parent", full_name: `Parent ${i}` });
  }
  return list;
}

export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1) Ensure demo school
        let { data: school } = await supabaseAdmin
          .from("schools").select("id").eq("slug", "demo").maybeSingle();
        if (!school) {
          const ins = await supabaseAdmin.from("schools")
            .insert({ name: SCHOOL_NAME, slug: "demo", status: "active" })
            .select("id").single();
          if (ins.error) return json({ error: ins.error.message }, 500);
          school = ins.data;
        }
        const schoolId = school!.id as string;

        // 2) List existing auth users (paginate)
        const existing = new Map<string, string>(); // email -> id
        let page = 1;
        while (true) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (error) return json({ error: error.message }, 500);
          for (const u of data.users) if (u.email) existing.set(u.email.toLowerCase(), u.id);
          if (data.users.length < 200) break;
          page++;
        }

        const roster = buildRoster();
        const results: { email: string; status: string }[] = [];

        for (const u of roster) {
          let userId = existing.get(u.email.toLowerCase());
          if (!userId) {
            const created = await supabaseAdmin.auth.admin.createUser({
              email: u.email,
              password: DEMO_PASSWORD,
              email_confirm: true,
              user_metadata: { full_name: u.full_name, ...(u.meta ?? {}) },
            });
            if (created.error) {
              results.push({ email: u.email, status: `error: ${created.error.message}` });
              continue;
            }
            userId = created.data.user!.id;
          }

          // Ensure profile linked to demo school
          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            email: u.email,
            full_name: u.full_name,
            school_id: u.role === "super_admin" ? null : schoolId,
            status: "active",
          });

          // Ensure role
          await supabaseAdmin.from("user_roles").upsert(
            { user_id: userId, role: u.role, school_id: u.role === "super_admin" ? null : schoolId },
            { onConflict: "user_id,role" },
          );

          results.push({ email: u.email, status: existing.has(u.email.toLowerCase()) ? "updated" : "created" });
        }

        return json({ ok: true, school: SCHOOL_NAME, password: DEMO_PASSWORD, count: results.length, results });
      },
      GET: async () =>
        json({
          hint: "POST to this endpoint to seed the demo accounts.",
          password: DEMO_PASSWORD,
        }),
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
