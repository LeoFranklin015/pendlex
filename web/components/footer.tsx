import Image from "next/image";
import Link from "next/link";

const columns = [
  {
    title: "Protocol",
    links: [
      { label: "Markets", href: "/app/markets" },
      { label: "Vault", href: "/app/vault" },
      { label: "Portfolio", href: "/app/portfolio" },
      { label: "Governance", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "https://docs.pendlex.io" },
      { label: "Whitepaper", href: "/whitepaper" },
      { label: "Audit Reports", href: "/audits" },
      { label: "Brand Kit", href: "/brand" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Twitter", href: "https://twitter.com/pendlex" },
      { label: "Discord", href: "https://discord.gg/pendlex" },
      { label: "Telegram", href: "https://t.me/pendlex" },
      { label: "GitHub", href: "https://github.com/pendlex" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo-transparent.png"
                alt="pendleX logo"
                width={28}
                height={28}
                className="h-7 w-7"
              />
              <span className="text-base font-semibold tracking-tight text-foreground">
                pendleX
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Split tokenized ETFs into income and price exposure tokens. Two
              markets. One vault.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} pendleX Markets. All rights
            reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/terms"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
