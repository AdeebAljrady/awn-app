import { getAllUsers } from "@/app/actions/admin/users";
import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage() {
  // Fetch initial data on server
  const result = await getAllUsers(1, 20, "");

  return (
    <AdminUsersClient
      initialUsers={result.data?.users || []}
      initialTotal={result.data?.total || 0}
    />
  );
}
