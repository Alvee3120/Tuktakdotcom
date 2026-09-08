import { cn } from '@/lib/utils';

type UserAvatarProps = {
  image?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-20 w-20 text-3xl',
};

export function UserAvatar({ image, name, size = 'md', className }: UserAvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';

  if (image) {
    return (
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-full',
          sizeClasses[size],
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'from-primary to-primary/60 flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm',
        sizeClasses[size],
        className
      )}
    >
      {initial}
    </div>
  );
}
