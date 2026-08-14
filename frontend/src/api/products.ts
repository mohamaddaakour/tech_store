import type { Product } from "../types/product";
import { apiGet } from "./client";

// Function to call the api and get all products from database
export async function getAllProducts(): Promise<Product[]> {
    return await apiGet("/products");
}