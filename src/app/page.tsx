import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";
import { getStores, type Store } from "@/lib/customer";

export const dynamic = "force-dynamic";

export default async function Home() {
  let stores: Store[] = [];
  let loadError = false;

  try {
    stores = await getStores();
  } catch {
    loadError = true;
  }

  return (
    <CustomerShell>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-14">
        <div className="overflow-hidden rounded-[2rem] bg-[#173b35] px-6 py-10 text-white shadow-xl shadow-[#173b35]/10 sm:px-12 sm:py-14">
          <p className="mb-4 text-sm font-bold text-[#b7dec9]">أهلاً بك في هاتها</p>
          <h1 className="max-w-2xl text-3xl font-black leading-tight sm:text-5xl">كل ما تحتاجه من متاجر بلطيم، في طريقه إليك.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#d4e8df]">تصفّح المتاجر المحلية واكتشف المنتجات المتاحة بالقرب منك.</p>
          <a href="#stores" className="mt-7 inline-flex rounded-2xl bg-[#f2c879] px-5 py-3 font-black text-[#173b35] transition hover:bg-[#ffd98e]">تصفّح المتاجر</a>
        </div>

        <div id="stores" className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#779187]">المتاجر القريبة</p>
              <h2 className="mt-1 text-2xl font-black">اختر متجرك</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#6a8278]">{stores.length} متجر</span>
          </div>

          {loadError ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-rose-800">تعذّر تحميل المتاجر الآن. حاول تحديث الصفحة مرة أخرى.</div>
          ) : stores.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#c8dcd1] bg-white p-10 text-center">
              <p className="text-lg font-black">لا توجد متاجر متاحة حالياً</p>
              <p className="mt-2 text-sm text-[#6a8278]">سنخبرك عندما تنضم متاجر جديدة إلى هاتها.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => {
                const isOpen = store.is_open && store.operational_available;
                return (
                  <Link key={store.id} href={`/stores/${store.id}`} className="group rounded-3xl border border-[#e1ebe5] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="mb-6 flex items-start justify-between gap-3">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e6f2eb] text-2xl">{store.name.trim().charAt(0)}</div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{isOpen ? "مفتوح الآن" : "مغلق الآن"}</span>
                    </div>
                    <h3 className="text-xl font-black group-hover:text-[#27735e]">{store.name}</h3>
                    <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-[#6a8278]">{store.description || "متجر محلي على هاتها"}</p>
                    <p className="mt-4 border-t border-[#edf2ee] pt-4 text-sm text-[#6a8278]">{store.address}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </CustomerShell>
  );
}
