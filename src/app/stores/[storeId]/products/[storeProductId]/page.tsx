import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { CustomerShell } from "@/components/customer-shell";
import { getStore, getStoreProduct, inventoryLabel } from "@/lib/customer";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ storeId: string; storeProductId: string }> };

export default async function ProductPage({ params }: Props) {
  const { storeId, storeProductId } = await params;
  const [store, item] = await Promise.all([getStore(storeId), getStoreProduct(storeId, storeProductId)]);
  if (!store || !item || !item.product) notFound();
  const availability = inventoryLabel(item.inventory?.status ?? "UNKNOWN");
  const cartItem = { storeId: store.id, storeName: store.name, storeProductId: item.id, productId: item.product.id, productName: item.product.name, description: item.product.description, imagePath: item.product.image_path, quantity: 1, unitPrice: item.effective_price, inventoryStatus: item.inventory?.status ?? "UNKNOWN" as const };

  return <CustomerShell><section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12"><Link href={`/stores/${store.id}`} className="text-sm font-bold text-[#568171] hover:text-[#173b35]">← العودة إلى {store.name}</Link><article className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm sm:p-10"><div className="flex h-64 items-center justify-center rounded-3xl bg-[#f2f6f2] text-8xl">{item.product.name.trim().charAt(0)}</div><div className="mt-8 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-[#779187]">{store.name}</p><h1 className="mt-2 text-3xl font-black">{item.product.name}</h1></div><div className="text-left text-2xl font-black text-[#27735e]">{item.effective_price < Number(item.price) && <><del className="ml-2 text-base text-[#8aa097]">{Number(item.price).toFixed(2)}</del><p className="text-sm text-amber-700">{item.offers[0]?.name ?? "عرض نشط"}</p></>}{Number(item.effective_price).toFixed(2)} ج.م</div></div><p className="mt-6 whitespace-pre-wrap leading-8 text-[#6a8278]">{item.product.description || "لا يوجد وصف لهذا المنتج."}</p><div className="mt-8 flex items-center justify-between rounded-2xl bg-[#faf8f3] p-4"><span className="font-bold">حالة التوفر</span><span className={`rounded-full px-3 py-1 text-sm font-bold ${availability.className}`}>{availability.text}</span></div>{item.inventory?.last_updated_at && <p className="mt-3 text-xs text-[#8aa097]">آخر تحديث للمخزون: {new Date(item.inventory.last_updated_at).toLocaleString("ar-EG")}</p>}<AddToCart item={cartItem} /></article></section></CustomerShell>;
}
