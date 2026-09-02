import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminAccessError, requireAdmin } from "@/lib/admin";
import { getAdminDashboardData } from "@/lib/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let context: Awaited<ReturnType<typeof requireAdmin>>;

  try {
    context = await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError && error.status === 401) {
      redirect("/login?next=/admin");
    }

    if (error instanceof AdminAccessError && error.status === 403) {
      return <AdminAccessDenied email={error.userEmail} />;
    }

    return <AdminSetupNotice />;
  }

  try {
    const data = await getAdminDashboardData(context);
    return <AdminDashboard {...data} isFounder={context.isFounder} />;
  } catch {
    return <AdminSetupNotice />;
  }
}

function AdminAccessDenied({ email }: { email?: string | null }) {
  return (
    <main className="admin-setup-notice">
      <p>Administrator access is required.</p>
      <span>Authenticated as {email ?? "an unknown account"}. This account is not authorized for the Cova console.</span>
    </main>
  );
}

function AdminSetupNotice() {
  return (
    <main className="admin-setup-notice">
      <p>Admin setup is incomplete.</p>
      <span>Run the admin dashboard migration in Supabase, then reload this page.</span>
    </main>
  );
}
