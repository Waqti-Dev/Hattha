import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { MerchantProductManager } from "@/components/merchant-product-manager";
import { getMerchantContext, getMerchantProducts } from "@/lib/merchant";

export const dynamic = "force-dynamic";
export default async function MerchantProductsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const context = await getMerchantContext();
  if (!context.stores.some((store) => store.id === storeId)) notFound();
  const products = await getMerchantProducts(storeId);
  return <CustomerShell><section className="mx-auto max-w-4xl px-4 py-8"><p className="text-sm font-bold text-[#779187]">إدارة المتجر</p><h1 className="mt-2 text-3xl font-black">المنتجات والأسعار والمخزون</h1><div className="mt-6"><MerchantProductManager storeId={storeId} initialProducts={products} /></div></section></CustomerShell>;
}
