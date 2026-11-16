import { getCurrentUser } from "@/lib/session";
import { CartView } from "@/components/CartView";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getCurrentUser();
  return <CartView signedIn={Boolean(user)} />;
}
