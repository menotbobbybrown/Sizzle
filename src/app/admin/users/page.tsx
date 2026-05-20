import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Users",
};

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
      <p className="mt-1 text-zinc-500">Manage platform users.</p>
      <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-6">
        <p className="text-zinc-500 text-center py-12">User management interface.</p>
      </div>
    </div>
  );
}