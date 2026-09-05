import Link from "next/link";
import { Coins, Droplets, Home, ShoppingBasket, Truck, User } from "lucide-react";

const items = [
  { href: "/", label: "La Cătun", sub: "Feed", icon: Home },
  { href: "/piata", label: "Mânzare", sub: "Produse", icon: ShoppingBasket },
  { href: "/logistica", label: "Strungă", sub: "Logistica", icon: Truck },
  { href: "/scofaluta", label: "Scofalută", sub: "RON", icon: Coins },
  { href: "/cont", label: "Cont", sub: "Profil", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur pb-safe">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {items.map(({ href, label, sub, icon: Icon }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              className="flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] text-zinc-500 transition active:scale-95 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="font-medium leading-none">{label}</span>
              <span className="text-[9px] leading-none text-zinc-400">{sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ApaQuickLink() {
  return (
    <Link
      href="/apa"
      className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200"
    >
      <Droplets className="h-4 w-4" aria-hidden />
      Apa — Irigații (ghid țărani)
    </Link>
  );
}
