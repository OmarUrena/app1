import { ButtonLink, EmptyState, SectionContainer } from "@/components/ui";
import { PublicShell } from "@/components/public-shell";
export default function NotFound() {
  return <PublicShell><SectionContainer className="section"><EmptyState title="No encontramos esta página" action={<ButtonLink href="/">Volver al inicio</ButtonLink>}>Comprueba la dirección o vuelve al inicio para continuar. Si buscabas una rifa, puede que ya no esté publicada o que su participación esté pausada o cerrada.</EmptyState><div className="checkout-actions"><ButtonLink href="/orden/recuperar" className="button-secondary">Recuperar un envío pendiente</ButtonLink></div></SectionContainer></PublicShell>;
}
