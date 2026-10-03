import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";
import { FavoriteButton } from "@/components/favorite-button";
import { getActiveOffers, getPopularStores, getStoreCategories, getStores, type Store } from "@/lib/customer";

export const dynamic = "force-dynamic";
type Props = { searchParams?: Promise<{ q?: string; category?: string }> };

function SectionHeading({ kicker, title, count }: { kicker: string; title: string; count?: string }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="section-kicker">{kicker}</p><h2 className="section-heading mt-1">{title}</h2></div>{count && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#6a8278]">{count}</span>}</div>;
}

function StoreCard({ store, orderCount }: { store: Store; orderCount?: number }) {
  const isOpen = store.is_open && store.operational_available;
  return <Link href={`/stores/${store.id}`} className="surface-card group relative block p-5 hover:-translate-y-0.5">
    <div className="absolute left-4 top-4 z-10"><FavoriteButton storeId={store.id} /></div>
    <div className="mb-6 flex items-start justify-between gap-3"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e6f2eb] text-2xl font-black text-[#27735e]">{store.name.trim().charAt(0)}</div><span className={`status-chip ${isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{isOpen ? "مفتوح الآن" : "مغلق الآن"}</span></div>
    <h3 className="text-xl font-black group-hover:text-[#27735e]">{store.name}</h3>{store.category && <p className="mt-1 text-xs font-black text-[#779187]">{store.category}</p>}
    <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-[#6a8278]">{store.description || "متجر محلي على هاتها"}</p>
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#edf2ee] pt-4 text-sm text-[#6a8278]"><span className="truncate">{store.address}</span>{typeof orderCount === "number" && <span className="shrink-0 font-black text-[#27735e]">{orderCount} طلب</span>}</div>
  </Link>;
}

export default async function Home({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const search = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  let stores: Store[] = [];
  let categories: string[] = [];
  let popular: Array<Store & { order_count: number }> = [];
  let offers: Awaited<ReturnType<typeof getActiveOffers>> = [];
  let newStores: Store[] = [];
  let loadError = false;
  try { [stores, categories, popular, offers, newStores] = await Promise.all([getStores({ search, category }), getStoreCategories(), getPopularStores(), getActiveOffers(), getStores()]); } catch { loadError = true; }
  const popularById = new Map(popular.map((store) => [store.id, store.order_count]));

  return <CustomerShell><section className="shell-inner px-3 pb-10 pt-6 sm:px-0 sm:pb-14 sm:pt-10">
    <div className="hero-panel px-5 py-7 sm:px-10 sm:py-9"><p className="text-sm font-bold text-[#b7dec9]">اكتشف محلياً، اطلب ببساطة</p><h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">متاجر بلطيم المفضلة، أقرب إليك.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-[#d4e8df]">تصفّح متاجر حقيقية ومنتجات متاحة الآن، ثم اطلب بالدفع عند الاستلام.</p><form action="/" className="mt-6 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="home-search">ابحث عن متجر أو منتج</label><input id="home-search" name="q" defaultValue={search} placeholder="ابحث عن متجر أو منتج…" className="min-h-12 flex-1 rounded-xl border-0 bg-white px-4 text-[#173b35] outline-none" /><button className="btn-accent min-h-12">بحث</button></form><div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-[#b7dec9]"><span>متاجر محلية حقيقية</span><span>تحديثات طلب مباشرة</span><span>الدفع عند الاستلام</span></div></div>
    <div className="mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="تصنيفات المتاجر"><Link href="/" className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black ${!category ? "bg-[#173b35] text-white" : "bg-white text-[#6a8278]"}`}>كل التصنيفات</Link>{categories.map((item) => <Link key={item} href={`/?category=${encodeURIComponent(item)}${search ? `&q=${encodeURIComponent(search)}` : ""}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black ${category === item ? "bg-[#173b35] text-white" : "bg-white text-[#6a8278]"}`}>{item}</Link>)}</div>
    {loadError ? <div className="mt-8 rounded-3xl border border-rose-100 bg-rose-50 p-6 text-rose-800">تعذّر تحميل بيانات المتاجر الآن. <Link href="/" className="font-black underline">حاول مرة أخرى</Link></div> : <>
      {search || category ? <section id="stores" className="mt-8"><SectionHeading kicker="نتائج البحث والتصفية" title="المتاجر المطابقة" count={`${stores.length} متجر`} />{stores.length === 0 ? <div className="surface-card border-dashed p-10 text-center"><p className="text-lg font-black">لا توجد نتائج مطابقة حالياً</p><p className="mt-2 text-sm text-[#6a8278]">جرّب اسماً آخر أو تصنيفاً مختلفاً.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stores.map((store) => <StoreCard key={store.id} store={store} orderCount={popularById.get(store.id)} />)}</div>}</section> : <>
        <section className="mt-9"><SectionHeading kicker="المتاجر المتاحة" title="ابدأ من متجر قريب" count={`${stores.length} متجر`} />{stores.length === 0 ? <div className="surface-card border-dashed p-10 text-center"><p className="text-lg font-black">لا توجد متاجر متاحة حالياً</p><p className="mt-2 text-sm text-[#6a8278]">سنخبرك عندما تنضم متاجر جديدة إلى هاتها.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stores.map((store) => <StoreCard key={store.id} store={store} />)}</div>}</section>
        <section className="mt-12"><SectionHeading kicker="من الطلبات الحقيقية" title="الأكثر طلباً" />{popular.length === 0 ? <div className="surface-card border-dashed p-8 text-center text-sm text-[#6a8278]">ستظهر المتاجر الأكثر طلباً بعد تسجيل طلبات حقيقية.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{popular.map((store) => <StoreCard key={store.id} store={store} orderCount={store.order_count} />)}</div>}</section>
        <section className="mt-12"><SectionHeading kicker="الأحدث" title="متاجر جديدة" />{newStores.length === 0 ? <div className="surface-card border-dashed p-8 text-center text-sm text-[#6a8278]">لا توجد متاجر جديدة حالياً.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{newStores.slice(0, 3).map((store) => <StoreCard key={store.id} store={store} />)}</div>}</section>
        <section className="mt-12"><SectionHeading kicker="عروض فعلية" title="خصومات المتاجر" />{offers.length === 0 ? <div className="surface-card border-dashed p-8 text-center text-sm text-[#6a8278]">لا توجد عروض نشطة حالياً.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{offers.map((offer) => <Link key={offer.id} href={offer.stores ? `/stores/${offer.stores.id}` : "/"} className="surface-card border-amber-100 bg-[#fffaf0] p-5 hover:-translate-y-0.5"><span className="text-2xl font-black text-amber-700">%</span><h3 className="mt-4 text-lg font-black">{offer.name}</h3><p className="mt-2 text-sm text-[#6a8278]">{offer.stores?.name ?? "متجر"}</p><p className="mt-4 font-black text-amber-700">خصم {offer.discount_type === "PERCENTAGE" ? `${offer.discount_value}%` : `${offer.discount_value} ج.م`}</p></Link>)}</div>}</section>
      </>}
    </>}
  </section></CustomerShell>;
}
