import Link from "next/link";
import type { Product } from "@/mocks/types";
import { QuickAddButton } from "@/features/cart";
import { ProductPhoto } from "@/features/menu/ProductPhoto";
import { formatPrice } from "@/shared/lib/format-price";

type ProductListCardProps = {
  product: Product;
  eager?: boolean;
};

/** Borderless product tile for Explore results: photo with badge, info, price and "+". */
export function ProductListCard({ product, eager = false }: ProductListCardProps) {
  return (
    <article className="relative flex min-w-0 flex-col gap-2">
      <div className="relative h-[126px] w-full shrink-0 overflow-hidden rounded-2xl">
        <ProductPhoto src={product.image} alt="" sizes="171px" eager={eager} />
        {product.badge ? (
          <span className="absolute top-2.5 left-2.5 flex h-6 items-center rounded-xl bg-white/91 px-[9px] text-[9px] font-bold text-brand">
            {product.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-[3px]">
        <h3 className="truncate text-[14px] font-bold text-ink">
          <Link href={`/product/${product.id}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-2 text-[10px] leading-3 text-muted">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-ink">{formatPrice(product.price)}</span>
          <QuickAddButton productId={product.id} size={28} />
        </div>
      </div>
    </article>
  );
}
