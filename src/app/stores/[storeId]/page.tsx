import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { getStore, getStoreProducts, inventoryLabel } from "@/lib/customer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ storeId: string }> };

export default async function StorePage({ params }: Props) {
  const { storeId } = await params;
  const store = await getStore(storeId);
  if (!store) notFound();
  const products = await getStoreProducts(storeId);
  const isOpen = store.is_open && store.operational_available;

  return (
    <CustomerShell>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="text-sm font-bold text-[#568171] hover:text-[#173b35]">← العودة إلى المتاجر</Link>
        <div className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-[#e6f2eb] text-3xl">{store.name.trim().charAt(0)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black">{store.name}</h1><span className={`rounded-full px-3 py-1 text-xs font-black ${isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{isOpen ? "مفتوح الآن" : "مغلق الآن"}</span></div>
                <p className="mt-3 leading-7 text-[#6a8278]">{store.description || "متجر محلي على هاتها"}</p>
              </div>
            </div>
            <p className="text-sm text-[#6a8278]">{store.address}</p>
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-5"><p className="text-sm font-bold text-[#779187]">من قائمة المتجر</p><h2 className="mt-1 text-2xl font-black">المنتجات</h2></div>
          {products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#c8dcd1] bg-white p-10 text-center"><p className="font-black">لا توجد منتجات متاحة حالياً</p><p className="mt-2 text-sm text-[#6a8278]">لم يضف هذا المتجر منتجاته بعد.</p></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((item) => {
                const availability = inventoryLabel(item.inventory?.status ?? "UNKNOWN");
                return <Link key={item.id} href={`/stores/${store.id}/products/${item.id}`} className="rounded-3xl border border-[#e1ebe5] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-36 items-center justify-center rounded-2xl bg-[#f2f6f2] text-5xl">{item.product?.name.trim().charAt(0) || "؟"}</div><div className="mt-5 flex items-start justify-between gap-3"><h3 className="text-lg font-black">{item.product?.name || "منتج"}</h3><span className="whitespace-nowrap text-lg font-black text-[#27735e]">{item.price.toFixed(2)} ج.م</span></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6a8278]">{item.product?.description || "تفاصيل المنتج غير متاحة"}</p><span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${availability.className}`}>{availability.text}</span></Link>;
              })}
            </div>
          )}
        </div>
      </section>
    </CustomerShell>
  );
}
