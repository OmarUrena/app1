import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "./icon";

export function SectionContainer({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`container ${className}`} {...props} />;
}
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props} />;
}
export function ButtonLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return <Link className={`button ${className}`} {...props} />;
}
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}
export function Alert({ children, title, tone = "info" }: { children: ReactNode; title: string; tone?: "info" | "error" }) {
  return <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "note"}><strong>{title}</strong><div>{children}</div></div>;
}
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <Card className="empty-state"><span className="empty-symbol"><Icon name="spark" /></span><h2>{title}</h2><p>{children}</p>{action}</Card>;
}
export function Input({ label, hint, error, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string }) {
  const description = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div className="field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-describedby={description} aria-invalid={error ? true : undefined} />{hint && <p id={`${id}-hint`} className="muted">{hint}</p>}{error && <p id={`${id}-error`} className="field-error">{error}</p>}</div>;
}
