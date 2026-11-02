import { ButtonLink, EmptyState, SectionContainer } from "@/components/ui";
export default function NotFound() {
  return <SectionContainer className="section"><EmptyState title="No encontramos esta página" action={<ButtonLink href="/">Volver al inicio</ButtonLink>}>Comprueba la dirección o vuelve al inicio para continuar. Si buscabas una rifa, puede que ya no esté publicada o que su participación esté pausada o cerrada.</EmptyState></SectionContainer>;
}
