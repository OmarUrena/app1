import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SectionContainer } from "@/components/ui";
import { ToastProvider } from "@/components/ui/toast";
import { BottomNavigation } from "@/components/bottom-navigation";
import { readEnvironment } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "App Sorteos · República Dominicana", template: "%s | App Sorteos" },
  description: "Conoce App Sorteos. Cantidad a tu elección, números asignados por el servidor y verificación manual del pago.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { mode } = readEnvironment(process.env);
  return <html lang="es-DO" data-scroll-behavior="smooth"><body><a href="#contenido" className="skip-link">Saltar al contenido</a><ToastProvider><Header /><div className="environment-note"><SectionContainer>{mode === "mock" ? <><strong>DEMO · Sin transacciones reales</strong><span>Imágenes y cifras ilustrativas. No se aceptan compras.</span></> : <><strong>En preparación</strong><span>Las compras todavía no están habilitadas.</span></>}</SectionContainer></div><main id="contenido" tabIndex={-1}>{children}</main><Footer /><BottomNavigation /></ToastProvider></body></html>;
}
