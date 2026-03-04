import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center"
      role="status"
      aria-label={title}
    >
      <p className="text-muted-foreground font-medium">{title}</p>
      {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      {action && (
        <div className="mt-4">
          {action.onClick ? (
            <Button variant="outline" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : action.href?.startsWith('http') ? (
            <Button variant="outline" size="sm" asChild>
              <a href={action.href} target="_blank" rel="noopener noreferrer">
                {action.label}
              </a>
            </Button>
          ) : action.href ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <a href="https://github.com/KuzmunKirill3384/monstack#readme" target="_blank" rel="noopener noreferrer">
                {action.label}
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
