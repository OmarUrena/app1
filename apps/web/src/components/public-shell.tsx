import { Header } from "./header";
import { Footer } from "./footer";
import { BottomNavigation } from "./bottom-navigation";
import { SectionContainer } from "./ui";
import { readEnvironment } from "@/lib/config";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { mode } = readEnvironment(process.env);
  return <><a href="#contenido" className="skip-link" tabIndex={0}>Saltar al contenido</a><Header /><div className="environment-note"><SectionContainer>{mode === "mock" ? <><strong>DEMO · Sin transacciones reales</strong><span>Imágenes y cifras ilustrativas. No se aceptan compras.</span></> : <><strong>Transferencia con revisión manual</strong><span>Envía tus datos y el comprobante juntos. El pago se verifica después.</span></>}</SectionContainer></div><main id="contenido" tabIndex={-1}>{children}</main><Footer /><BottomNavigation /></>;
}
