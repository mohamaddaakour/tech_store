import type { Product } from "../types/product";
import { useCartStore } from "../store/cartStore";

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const add = useCartStore((s) => s.add);

    // This line converts a price stored in cents (as an integer) into a
    // nicely formatted currency string like "$19.99".
    const price = (product.priceCents / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });

    const inStock = product.stock > 0;

    return (
        <div className="bg-surface rounded-xl overflow-hidden transition-transform hover:scale-105 hover:ring-2 hover:ring-accent">
            <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover" />

            <div className="p-4">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-400">{price}</p>
                <p className={`text-xs ${inStock ? "text-gray-500" : "text-red-400"}`}>
                    {inStock ? `${product.stock} in stock` : "Out of stock"}
                </p>
                <button
                    onClick={() => add(product)}
                    disabled={!inStock}
                    className="mt-2 w-full py-1.5 rounded-lg bg-accent text-black text-sm font-medium disabled:opacity-40"
                >
                    Add to cart
                </button>
            </div>
        </div>
    )
}
