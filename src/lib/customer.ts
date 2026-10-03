import { createClient } from "@/lib/supabase/server";
export { inventoryLabel } from "@/lib/inventory";

export type Store = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address: string;
  location: Record<string, unknown> | null;
  is_active: boolean;
  is_open: boolean;
  operational_available: boolean;
};

export type StoreProduct = {
  id: string;
  store_id: string;
  product_id: string;
  price: number;
  is_active: boolean;
  product: {
    id: string;
    name: string;
    description: string | null;
    image_path: string | null;
  } | null;
  inventory: {
    status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
    quantity: number | null;
    last_updated_at: string;
  } | null;
};

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getStores(): Promise<Store[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, name, description, phone, address, location, is_active, is_open, operational_available",
    )
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Store[];
}

export async function getStore(storeId: string): Promise<Store | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, name, description, phone, address, location, is_active, is_open, operational_available",
    )
    .eq("id", storeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as Store | null) ?? null;
}

export async function getStoreProducts(storeId: string): Promise<StoreProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_products")
    .select(
      "id, store_id, product_id, price, is_active, products(id, name, description, image_path)",
    )
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("created_at");

  if (error) throw new Error(error.message);

  const products = (data ?? []).map((item) => {
    const row = item as unknown as Omit<StoreProduct, "product" | "inventory"> & {
      products: StoreProduct["product"];
    };
    return { ...row, product: row.products, inventory: null };
  });

  if (products.length === 0) return [];

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("product_id, status, quantity, last_updated_at")
    .eq("store_id", storeId)
    .in(
      "product_id",
      products.map((product) => product.product_id),
    );

  if (inventoryError) throw new Error(inventoryError.message);

  const inventoryByProduct = new Map(
    (inventory ?? []).map((item) => [
      (item as { product_id: string }).product_id,
      item as unknown as StoreProduct["inventory"],
    ]),
  );

  return products.map((product) => ({
    ...product,
    inventory: inventoryByProduct.get(product.product_id) ?? null,
  }));
}

export async function getStoreProduct(storeId: string, storeProductId: string) {
  const products = await getStoreProducts(storeId);
  return products.find((product) => product.id === storeProductId) ?? null;
}
