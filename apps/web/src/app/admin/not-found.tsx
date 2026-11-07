import { ButtonLink, Card } from "@/components/ui";
export default function AdminNotFound() { return <div className="admin-standalone"><Card><p className="eyebrow">Administración · 404</p><h1>No encontramos esta página</h1><p>Comprueba la dirección o regresa a tu espacio de trabajo.</p><ButtonLink href="/admin" prefetch={false}>Volver al panel</ButtonLink></Card></div>; }
