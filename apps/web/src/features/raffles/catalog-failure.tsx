"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Alert, Button } from "@/components/ui";

export function CatalogFailure({ error }: { error: { message: string; requestId?: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Alert title="El catálogo no está disponible"><p>{error.message}</p>{error.requestId && <p>Referencia: {error.requestId}</p>}<Button disabled={pending} onClick={() => start(() => router.refresh())}>{pending ? "Consultando…" : "Volver a intentar"}</Button></Alert>;
}

export function RefreshAvailability() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button className="button-secondary" disabled={pending} onClick={() => start(() => router.refresh())}>{pending ? "Consultando…" : "Actualizar cupo"}</Button>;
}
