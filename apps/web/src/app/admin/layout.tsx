import type { Metadata } from "next";
import "./admin.css";
export const metadata: Metadata = { title: { default: "Administración", template: "%s · Administración | AppSorteos" }, description: "Espacio de gestión de rifas, órdenes y pagos.", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <div className="admin-app"><a href="#contenido" className="skip-link">Saltar al contenido</a><main id="contenido" tabIndex={-1}>{children}</main></div>; }
