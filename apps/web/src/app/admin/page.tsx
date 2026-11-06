import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/server";
export default async function AdminPage() { await requireAdmin(); redirect("/admin/ordenes"); }
