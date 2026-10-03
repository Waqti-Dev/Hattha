import { createClient } from "@/lib/supabase/server";
export { inventoryLabel } from "@/lib/inventory";

export type Store = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  phone: string | null;
  address: string;
  location: Record<string, unknown> | null;
  is_active: boolean;
  is_open: boolean;
  operational_available: boolean;
  created_at: string;
};

export type StoreProduct = {
  id: string;
  store_id: string;
  product_id: string;
  price: number;
  effective_price: number;
  is_active: boolean;
  product: {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    image_path: string | null;
  } | null;
  inventory: {
    status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
    quantity: number | null;
    last_updated_at: string;
  } | null;
  offers: Array<{
    id: string;
    name: string;
    discount_type: "PERCENTAGE" | "FIXED";
    discount_value: number;
    starts_at: string;
    ends_at: string;
    max_quantity?: number | null;
  }>;
};

export type DiscoveryOffer = {
  id: string;
  name: string;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  starts_at: string;
  ends_at: string;
  stores: { id: string; name: string } | null;
};

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getStores(options: { search?: string; category?: string } = {}): Promise<Store[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, category, description, phone, address, location, is_active, is_open, operational_available, created_at")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);

  let stores = (data ?? []) as unknown as Store[];
  const category = options.category?.trim();
  const search = options.search?.trim().toLocaleLowerCase();
  if (category) stores = stores.filter((store) => store.category === category);
  if (!search) return stores;

  const { data: productRows, error: productError } = await supabase
    .from("store_products")
    .select("store_id, products(name)")
    .eq("is_active", true);
  if (productError) throw new Error(productError.message);
  const storeIdsWithMatchingProducts = new Set(
    (productRows ?? [])
      .filter((row) => String((row as { products?: { name?: string } | null }).products?.name ?? "").toLocaleLowerCase().includes(search))
      .map((row) => (row as { store_id: string }).store_id),
  );
  return stores.filter((store) => store.name.toLocaleLowerCase().includes(search) || storeIdsWithMatchingProducts.has(store.id));
}

export async function getStoreCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stores").select("category").eq("is_active", true).not("category", "is", null).order("category");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Array<{ category: string | null }>;
  return Array.from(new Set(rows.map((row) => row.category).filter((category): category is string => Boolean(category))));
}

export async function getPopularStores(): Promise<Array<Store & { order_count: number }>> {
  const supabase = await createClient();
  const [{ data: stores, error: storesError }, { data: orderRows, error: ordersError }] = await Promise.all([
    supabase.from("stores").select("id, name, category, description, phone, address, location, is_active, is_open, operational_available, created_at").eq("is_active", true),
    supabase.rpc("get_popular_stores" as never, { p_limit: 6 } as never),
  ]);
  if (storesError) throw new Error(storesError.message);
  if (ordersError) throw new Error(ordersError.message);
  const popularRows = (orderRows ?? []) as unknown as Array<{ store_id: string; order_count: number }>;
  const counts = new Map<string, number>(popularRows.map((candidate) => [candidate.store_id, Number(candidate.order_count)]));
  return ((stores ?? []) as unknown as Store[])
    .map((store) => ({ ...store, order_count: counts.get(store.id) ?? 0 }))
    .filter((store) => store.order_count > 0)
    .sort((a, b) => b.order_count - a.order_count || a.name.localeCompare(b.name))
    .slice(0, 6);
}

export async function getActiveOffers(limit = 6): Promise<DiscoveryOffer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("id, name, discount_type, discount_value, starts_at, ends_at, stores(id, name)")
    .eq("is_active", true)
    .order("starts_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DiscoveryOffer[];
}

export async function getStore(storeId: string): Promise<Store | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, category, description, phone, address, location, is_active, is_open, operational_available, created_at")
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
    .select("id, store_id, product_id, price, is_active, products(id, name, description, image_path, category), offer_products(offers(id, name, discount_type, discount_value, starts_at, ends_at, max_quantity))")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("created_at");
  if (error) throw new Error(error.message);

  const products = (data ?? []).map((item) => {
    const row = item as unknown as Omit<StoreProduct, "product" | "inventory"> & {
      products: StoreProduct["product"];
      offer_products: Array<{ offers: StoreProduct["offers"][number] | null }>;
    };
    const offers = row.offer_products?.map((entry) => entry.offers).filter(Boolean) as StoreProduct["offers"];
    const effectivePrice = offers.reduce((lowest, offer) => {
      const candidate = offer.discount_type === "PERCENTAGE"
        ? Math.max(0, Number(row.price) - Number(row.price) * Number(offer.discount_value) / 100)
        : Math.max(0, Number(row.price) - Number(offer.discount_value));
      return Math.min(lowest, Number(candidate.toFixed(2)));
    }, Number(row.price));
    return { ...row, product: row.products, inventory: null, offers, effective_price: effectivePrice };
  });
  if (products.length === 0) return [];

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("product_id, status, quantity, last_updated_at")
    .eq("store_id", storeId)
    .in("product_id", products.map((product) => product.product_id));
  if (inventoryError) throw new Error(inventoryError.message);
  const inventoryByProduct = new Map(
    (inventory ?? []).map((item) => [(item as { product_id: string }).product_id, item as unknown as StoreProduct["inventory"]]),
  );
  return products.map((product) => ({ ...product, inventory: inventoryByProduct.get(product.product_id) ?? null }));
}

export async function getStoreProduct(storeId: string, storeProductId: string) {
  const products = await getStoreProducts(storeId);
  return products.find((product) => product.id === storeProductId) ?? null;
}
