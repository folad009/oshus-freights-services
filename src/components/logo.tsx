import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_PATH = "/oshus-logo-new.png";

interface LogoProps {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function Logo({
  href = "/",
  className,
  imageClassName,
  priority = false,
}: LogoProps) {
  const image = (
    <Image
      src={LOGO_PATH}
      alt="Oshus Freight Services"
      width={350}
      height={100}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      className={cn("h-auto w-auto max-h-24", imageClassName)}
    />
  );


  if (!href) {
    return <div className={className}>{image}</div>;
  }

  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center", className)}>
      {image}
    </Link>
  );
}

export const BRAND_COLORS = {
  navy: "#1F3042",
  blue: "#37BAEE",
  white: "#FFFFFF",
  black: "#000000",
} as const;
