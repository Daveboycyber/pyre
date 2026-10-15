import { Link } from "@tanstack/react-router";
import type { NavItem } from "@/lib/site-nav";

/** Renders a router Link for routes and a plain anchor for in-page hashes. */
export function NavItemLink({
  item,
  className,
  activeClassName,
  onClick,
}: {
  item: NavItem;
  className?: string;
  /** Extra classes when the route is the current page (route items only). */
  activeClassName?: string;
  onClick?: () => void;
}) {
  return item.kind === "route" ? (
    <Link
      to={item.to}
      className={className}
      activeProps={
        activeClassName ? { className: activeClassName, "aria-current": "page" } : undefined
      }
      onClick={onClick}
    >
      {item.label}
    </Link>
  ) : (
    <a href={item.href} className={className} onClick={onClick}>
      {item.label}
    </a>
  );
}
