'use client';

export function SectionHeader({
  icon,
  iconBg,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-foreground text-sm font-bold">{title}</h2>
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
