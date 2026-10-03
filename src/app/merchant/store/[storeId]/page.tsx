import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { MerchantStoreForm } from "@/components/merchant-store-form";
import { getMerchantContext } from "@/lib/merchant";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function MerchantStorePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const context = await getMerchantContext();
  if (!context.stores.some((store) => store.id === storeId)) notFound();
  const supabase = await createClient();
  const { data: store } = await supabase.from("stores").select("id, name, category, address, phone, description").eq("id", storeId).maybeSingle();
  if (!store) notFound();
  return <CustomerShell><section className="mx-auto max-w-2xl px-4 py-8"><p className="text-sm font-bold text-[#779187]">إدارة المتجر</p><h1 className="mt-2 text-3xl font-black">إعدادات المتجر</h1><div className="mt-6"><MerchantStoreForm store={store as { id: string; name: string; address: string; category?: string | null; phone?: string | null; description?: string | null }} /></div></section></CustomerShell>;
}
