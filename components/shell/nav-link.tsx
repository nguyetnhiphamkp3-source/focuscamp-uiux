"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Feature-item link that adds the `active` class when current route
 * matches href (exact or prefix for sub-routes).
 */
export function FeatureLink({
  href,
  className = "feature-item",
  children,
  exact = false,
  prefetch = false,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  exact?: boolean;
  prefetch?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} prefetch={prefetch} className={`${className}${isActive ? " active" : ""}`}>
      {children}
    </Link>
  );
}
