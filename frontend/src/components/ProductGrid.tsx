import { useQuery } from '@tanstack/react-query'
import { getAllProducts } from '../api/products'
import type { Product } from '../types/product'
import { ProductCard } from './ProductCard'

export function ProductGrid() {
  const {
    data,
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: getAllProducts,
  })

  if (isLoading) return <p className="p-8">Loading products...</p>

  if (error) return <p className="text-red-400 p-8">Failed to load products: {error.message}</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8">
      {(data ?? []).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}