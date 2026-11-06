"use client";
import Image from "next/image";
import { useState, type ComponentProps } from "react";

export function PrizeImage(props: ComponentProps<typeof Image>) {
  const [failedSource, setFailedSource] = useState<unknown>();
  if (failedSource === props.src) return <span className="image-fallback">Imagen del premio no disponible</span>;
  return <Image {...props} alt={props.alt} onError={() => setFailedSource(props.src)} />;
}
