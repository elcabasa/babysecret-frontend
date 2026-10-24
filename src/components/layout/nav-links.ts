export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Catalog" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}
