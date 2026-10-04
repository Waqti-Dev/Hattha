import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";
import { FavoriteButton } from "@/components/favorite-button";
import { getActiveOffers, getPopularStores, getStoreCategories, getStores, type Store } from "@/lib/customer";
import { getAccessState, getHomePath } from "@/lib/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
type Props = { searchParams?: Promise<{ q?: string; category?: string }> };

function SectionHeading({ kicker, title, count, href }: { kicker: string; title: string; count?: string; href?: string }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div><p className="section-kicker">{kicker}</p><h2 className="section-heading mt-1">{title}</h2></div>{href ? <Link href={href} className="text-sm font-black text-[var(--brand)]">عرض الكل ←</Link> : count ? <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-black text-[var(--muted)]">{count}</span> : null}</div>;
}

function StoreCard({ store, orderCount }: { store: Store; orderCount?: number }) {
  const isOpen = store.is_open && store.operational_available;
  return <Link href={`/stores/${store.id}`} className="surface-card group relative block overflow-hidden p-4 hover:-translate-y-0.5">
    <div className="flex items-start justify-between gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-xl font-black text-[var(--brand)]">{store.name.trim().charAt(0)}</div><div className="flex items-center gap-2"><span className={`status-chip ${isOpen ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--surface-muted)] text-[var(--muted)]"}`}>{isOpen ? "مفتوح الآن" : "مغلق الآن"}</span><FavoriteButton storeId={store.id} /></div></div>
    <h3 className="mt-4 text-lg font-black group-hover:text-[var(--brand)]">{store.name}</h3>
    {store.category && <p className="mt-1 text-xs font-black text-[var(--muted-soft)]">{store.category}</p>}
    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-[var(--muted)]">{store.description || "متجر محلي على هاتها"}</p>
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]"><span className="truncate">{store.address}</span>{typeof orderCount === "number" && orderCount > 0 && <span className="shrink-0 font-black text-[var(--brand)]">{orderCount} طلب حقيقي</span>}</div>
  </Link>;
}

function EmptyState({ title, body, href = "/", action = "العودة للرئيسية" }: { title: string; body: string; href?: string; action?: string }) {
  return <div className="empty-state"><p className="text-lg font-black">{title}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{body}</p><Link href={href} className="btn-secondary mt-5">{action}</Link></div>;
}

export default async function Home({ searchParams }: Props) {
  const access = await getAccessState();
  if (access.user && access.role !== "CUSTOMER") redirect(getHomePath(access));
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
  const hasFilter = Boolean(search || category);

  return <CustomerShell><section className="shell-inner px-3 pb-10 pt-5 sm:px-0 sm:pb-14 sm:pt-8">
    <div className="mb-4 flex items-center justify-between gap-3 text-sm"><div><p className="data-label">موقع التوصيل</p><p className="font-black">بلطيم، كفر الشيخ</p></div><Link href="/addresses" className="font-black text-[var(--brand)]">تغيير العنوان</Link></div>
    <div className="hero-panel px-5 py-7 sm:px-9 sm:py-9"><p className="text-sm font-bold text-[#d1eadf]">طلبك المحلي يبدأ من هنا</p><h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">إيه اللي محتاجه النهارده؟</h1><p className="mt-3 max-w-xl text-sm leading-7 text-[#e4f2ec]">ابحث في المتاجر المتاحة حولك، وشوف المنتجات الحقيقية قبل ما تطلب.</p><form action="/" className="mt-6 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="home-search">ابحث عن متجر أو منتج</label><div className="flex min-h-12 flex-1 items-center rounded-xl bg-white px-4 text-[var(--foreground)]"><span aria-hidden="true" className="ml-3 text-lg text-[var(--muted-soft)]">⌕</span><input id="home-search" name="q" defaultValue={search} placeholder="ابحث عن متجر أو منتج…" className="min-w-0 flex-1 border-0 bg-transparent px-0 outline-none" /></div><button className="btn-accent min-h-12">بحث</button></form><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#d1eadf]"><span>متاجر حقيقية</span><span>دفع عند الاستلام</span><span>أسعار مؤكدة عند الطلب</span></div></div>
    <div className="mt-6"><div className="mb-3 flex items-center justify-between"><div><p className="section-kicker">تصفح سريع</p><h2 className="mt-1 text-xl font-black">اختار تصنيفك</h2></div></div><div className="flex gap-2 overflow-x-auto pb-2" aria-label="تصنيفات المتاجر"><Link href="/" className={`whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-black ${!category ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}>كل المتاجر</Link>{categories.map((item) => <Link key={item} href={`/?category=${encodeURIComponent(item)}${search ? `&q=${encodeURIComponent(search)}` : ""}`} className={`whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-black ${category === item ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}>{item}</Link>)}</div></div>
    {loadError ? <div className="mt-8 rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-5 text-sm font-bold text-[var(--danger)]">تعذّر تحميل بيانات المتاجر الآن. <Link href="/" className="underline">حاول مرة أخرى</Link></div> : <>
      {hasFilter ? <section className="mt-8"><SectionHeading kicker="نتائج البحث" title="المتاجر المطابقة" count={`${stores.length} متجر`} />{stores.length === 0 ? <EmptyState title="مش لاقيين حاجة مطابقة" body="جرّب كلمة أبسط أو اختار تصنيفاً مختلفاً. كل النتائج هنا من متاجر هاتها الفعلية." /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stores.map((store) => <StoreCard key={store.id} store={store} orderCount={popularById.get(store.id)} />)}</div>}</section> : <>
        <section className="mt-8"><SectionHeading kicker="متاح الآن" title="متاجر قريبة منك" count={`${stores.length} متجر`} />{stores.length === 0 ? <EmptyState title="لسه مفيش متاجر متاحة" body="سنخبرك عندما تنضم متاجر جديدة إلى هاتها. جرّب تغيير العنوان لاحقاً." href="/addresses" action="إدارة العناوين" /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stores.map((store) => <StoreCard key={store.id} store={store} />)}</div>}</section>
        <section className="mt-12"><SectionHeading kicker="من طلبات حقيقية" title="الأكثر طلباً" />{popular.length === 0 ? <EmptyState title="لسه بنجمع البيانات" body="ستظهر المتاجر الأكثر طلباً بعد تسجيل طلبات حقيقية من عملائنا." /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{popular.map((store) => <StoreCard key={store.id} store={store} orderCount={store.order_count} />)}</div>}</section>
        <section className="mt-12"><SectionHeading kicker="وصل حديثاً" title="متاجر جديدة" />{newStores.length === 0 ? <EmptyState title="لا توجد متاجر جديدة حالياً" body="تابعنا لاكتشاف المتاجر المحلية الجديدة عند انضمامها." /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{newStores.slice(0, 3).map((store) => <StoreCard key={store.id} store={store} />)}</div>}</section>
        <section className="mt-12"><SectionHeading kicker="عروض حقيقية" title="خصومات المتاجر" />{offers.length === 0 ? <EmptyState title="لا توجد عروض نشطة" body="لن نعرض خصومات وهمية. ستظهر العروض هنا فور تفعيلها من متجر حقيقي." /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{offers.map((offer) => <Link key={offer.id} href={offer.stores ? `/stores/${offer.stores.id}` : "/"} className="surface-card group p-5 hover:-translate-y-0.5"><span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-[var(--warning-soft)] text-xl font-black text-[var(--warning)]">%</span><h3 className="mt-4 text-lg font-black group-hover:text-[var(--brand)]">{offer.name}</h3><p className="mt-2 text-sm text-[var(--muted)]">{offer.stores?.name ?? "متجر"}</p><p className="mt-4 font-black text-[var(--warning)]">خصم {offer.discount_type === "PERCENTAGE" ? `${offer.discount_value}%` : `${offer.discount_value} ج.م`}</p></Link>)}</div>}</section>
      </>}
    </>}
  </section></CustomerShell>;
}
