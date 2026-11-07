"use client";
import { Alert, Button, SectionContainer } from "@/components/ui";
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <SectionContainer className="section"><h1>No pudimos cargar la página</h1><Alert title="Inténtalo de nuevo" tone="error">Ocurrió un problema al mostrar esta página.</Alert><div className="mt-6"><Button onClick={retry}>Volver a intentar</Button></div></SectionContainer>;
}
