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
  return <CustomerShell><section className="shell-inner px-3 py-7 sm:px-0 sm:py-10">
    <Link href="/" className="text-sm font-bold text-[#568171]">← العودة إلى المتاجر</Link>
    <div className="surface-card mt-6 p-5 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-[#e6f2eb] text-3xl font-black text-[#27735e]">{store.name.trim().charAt(0)}</div><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black">{store.name}</h1><FavoriteButton storeId={store.id} /><span className={`status-chip ${isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{isOpen ? "مفتوح الآن" : "مغلق الآن"}</span></div>{store.category && <p className="mt-2 text-sm font-black text-[#779187]">{store.category}</p>}<p className="mt-3 max-w-2xl leading-7 text-[#6a8278]">{store.description || "متجر محلي على هاتها"}</p></div></div><p className="text-sm text-[#6a8278]">{store.address}</p></div></div>
    <div className="mt-10"><div className="mb-5"><p className="section-kicker">من قائمة المتجر</p><h2 className="section-heading mt-1">المنتجات</h2></div>{products.length === 0 ? <div className="surface-card border-dashed p-10 text-center"><p className="font-black">لا توجد منتجات متاحة حالياً</p><p className="mt-2 text-sm text-[#6a8278]">لم يضف هذا المتجر منتجاته بعد.</p></div> : <StoreProductGrid storeId={store.id} products={products} />}</div>
  </section></CustomerShell>;
}
