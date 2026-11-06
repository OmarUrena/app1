"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui";
import { CheckoutForm } from "@/features/checkout/form";
import { readIntent, type Intent } from "@/features/checkout/persistence";
import { readOrderIntent } from "./intent";

export function OrderRecovery({ baseUrl, maxBytes }: { baseUrl: string; maxBytes: number }) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    void Promise.resolve().then(() => {
      if (!current) return;
      try {
        const stored = readIntent(sessionStorage), order = readOrderIntent(sessionStorage);
        if (stored) setIntent({ ...stored, rulesVersion: order?.rulesVersion ?? stored.rulesVersion });
      } catch { setFailed(true); }
      setReady(true);
    });
    return () => { current = false; };
  }, []);
  if (!ready) return <p role="status">Buscando la intención de esta pestaña…</p>;
  if (failed || !intent) return <Alert title="No encontramos un envío recuperable en esta pestaña">Si ya transferiste o enviaste un comprobante, no repitas el pago ni crees una orden nueva. <Link href="/orden/confirmacion">Consulta la última orden</Link> o <Link href="/ayuda#incidencias">solicita asistencia</Link>.</Alert>;
  return <><Alert title="Recuperación protegida">Solo se consultará el cupo de tu sesión. No se crea otro automáticamente. Si la respuesta de un envío se perdió, reutiliza los datos y el archivo originales.</Alert><CheckoutForm key={intent.raffleId} baseUrl={baseUrl} recoveryOnly maxBytes={maxBytes} raffle={{ id: intent.raffleId, slug: intent.slug, title: intent.title ?? "Tu pre-reserva", min: intent.quantity, max: intent.quantity, rulesVersion: intent.rulesVersion, rules: intent.rules }} /></>;
}
