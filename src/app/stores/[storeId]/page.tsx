import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { FavoriteButton } from "@/components/favorite-button";
import { StoreProductGrid } from "@/components/store-product-grid";
import { getStore, getStoreProducts } from "@/lib/customer";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ storeId: string }> };

export default async function StorePage({ params }: Props) {
  const { storeId } = await params;
  const [store, products] = await Promise.all([getStore(storeId), getStoreProducts(storeId)]);
  if (!store) notFound();
  const isOpen = store.is_open && store.operational_available;
  return <CustomerShell><section className="shell-inner px-3 py-6 sm:px-0 sm:py-9">
    <Link href="/" className="text-sm font-bold text-[var(--brand)]">← العودة إلى المتاجر</Link>
    <div className="surface-card mt-5 p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[var(--brand-soft)] text-3xl font-black text-[var(--brand)]">{store.name.trim().charAt(0)}</div><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black">{store.name}</h1><FavoriteButton storeId={store.id} /><span className={`status-chip ${isOpen ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--surface-muted)] text-[var(--muted)]"}`}>{isOpen ? "مفتوح الآن" : "مغلق الآن"}</span></div>{store.category && <p className="mt-2 text-sm font-black text-[var(--muted-soft)]">{store.category}</p>}<p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">{store.description || "متجر محلي على هاتها"}</p></div></div><div className="rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]"><span className="data-label block">العنوان</span>{store.address}</div></div></div>
    <div className="mt-8"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="section-kicker">قائمة المتجر</p><h2 className="section-heading mt-1">اختار اللي يناسبك</h2></div><span className="text-sm text-[var(--muted)]">{products.length} منتج</span></div>{products.length === 0 ? <div className="empty-state"><p className="font-black">لا توجد منتجات متاحة حالياً</p><p className="mt-2 text-sm text-[var(--muted)]">لم يضف هذا المتجر منتجاته بعد.</p></div> : <StoreProductGrid storeId={store.id} products={products} />}</div>
  </section></CustomerShell>;
}
