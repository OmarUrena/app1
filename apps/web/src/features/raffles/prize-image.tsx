"use client";
import Image from "next/image";
import { useState, type ComponentProps } from "react";

export function PrizeImage(props: ComponentProps<typeof Image>) {
  const [failedSource, setFailedSource] = useState<unknown>();
  if (failedSource === props.src) return <span className="image-fallback">Imagen del premio no disponible</span>;
  return <Image {...props} unoptimized={props.unoptimized || (typeof props.src === "string" && /^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/v1\/media\//.test(props.src))} alt={props.alt} onError={() => setFailedSource(props.src)} />;
}
