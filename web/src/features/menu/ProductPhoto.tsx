import Image from "next/image";
import clsx from "clsx";

type ProductPhotoProps = {
  src?: string;
  alt: string;
  sizes: string;
  eager?: boolean;
  className?: string;
};

/** A product photo filling its (relative) container; products without one show a sand placeholder. */
export function ProductPhoto({ src, alt, sizes, eager = false, className }: ProductPhotoProps) {
  if (!src) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={clsx("absolute inset-0 bg-[#dad4c8]", className)}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={eager ? "eager" : undefined}
      className={clsx("object-cover", className)}
    />
  );
}
