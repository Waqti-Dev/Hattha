import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { getCustomerOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ orderId: string }> };

export default async function PaymentPage({ params }: Props) {
  const { orderId } = await params; const { user, order } = await getCustomerOrder(orderId); if (!user || !order) notFound();
  const row = order as { id: string; payment_method: string; online_payment_method: string | null; total: number; status: string; payments: { status: string }[] | null; stores: { name: string } | null };
  const payment = row.payments?.[0];
  return <CustomerShell><section className="mx-auto max-w-xl px-4 py-12 sm:py-20"><Link href={`/orders/${row.id}`} className="text-sm font-bold text-[#568171]">← العودة إلى الطلب</Link><div className="mt-6 rounded-[2rem] bg-white p-7 text-center shadow-sm"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#fff5dc] text-3xl">⌛</div><p className="mt-6 text-sm font-bold text-[#779187]">{row.stores?.name || "متجر"}</p><h1 className="mt-2 text-3xl font-black">حالة الدفع</h1><p className="mt-4 leading-7 text-[#6a8278]">المبلغ المطلوب: <strong className="text-[#173b35]">{Number(row.total).toFixed(2)} ج.م</strong></p><p className="mt-4 rounded-2xl bg-[#faf8f3] p-4 text-sm leading-7 text-[#6a8278]">{row.payment_method === "COD" ? "هذا الطلب بالدفع عند الاستلام. لا يلزم إجراء إلكتروني الآن." : "الدفع الإلكتروني غير موصول بمزود دفع في هذه المرحلة. لم يتم تأكيد أي دفعة، وحالة الدفع ما زالت معلّقة بأمان."}</p><p className="mt-5 font-black text-[#27735e]">{payment?.status === "CONFIRMED" ? "تم تأكيد الدفع" : "الدفع معلّق"}</p></div></section></CustomerShell>;
}
