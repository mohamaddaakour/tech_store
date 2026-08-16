export interface Product {
  id: number;
  name: string;
  description: string;

  priceCents: number;
  stock: number;
  imageUrl: string;

  inStock: boolean;

  categoryName: string | null;
  categorySlug: string | null;
  brandName: string | null;
  brandSlug: string | null;

  createdAt: string;
}

export interface Facet {
  id: number;
  name: string;
  slug: string;

  productCount: number;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ProductQuery {
  search?: string;
  category?: string;
  brand?: string;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  page?: number;
  size?: number;
}
