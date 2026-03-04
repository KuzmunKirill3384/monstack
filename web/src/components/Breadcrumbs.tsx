import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-muted-foreground hover:text-foreground underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium' : 'text-muted-foreground'}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
