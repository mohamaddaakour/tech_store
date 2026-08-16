import type { Product } from "../../types/product";
import { ProductTile } from "./ProductTile";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <ProductTile

          key={product.id}
          product={product}

          index={index}
        />
      ))}
    </div>
  );
}
