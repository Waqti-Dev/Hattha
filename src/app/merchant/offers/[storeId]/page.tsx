import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { MerchantOfferManager } from "@/components/merchant-offer-manager";
import { getMerchantContext, getMerchantOffers, getMerchantProducts } from "@/lib/merchant";

export const dynamic = "force-dynamic";
export default async function MerchantOffersPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const context = await getMerchantContext();
  if (!context.stores.some((store) => store.id === storeId)) notFound();
  const [products, offers] = await Promise.all([getMerchantProducts(storeId), getMerchantOffers(storeId)]);
  return <CustomerShell><section className="mx-auto max-w-4xl px-4 py-8"><p className="text-sm font-bold text-[#779187]">إدارة المتجر</p><h1 className="mt-2 text-3xl font-black">العروض والخصومات</h1><div className="mt-6"><MerchantOfferManager storeId={storeId} products={products} initialOffers={offers} /></div></section></CustomerShell>;
}
