import Link from "next/link";
import { SectionContainer } from "./ui";
export function Footer() {
  return <footer className="footer"><SectionContainer className="footer-inner"><div><strong>AppSorteos<span className="accent">.</span></strong><p>Grandes ilusiones. Información clara.</p></div><p>República Dominicana · RD$</p><div className="footer-links"><Link href="/ayuda">Ayuda</Link><Link href="/admin/login">Administración</Link></div></SectionContainer></footer>;
}
