import { useState } from 'react';

type BrandAvatarProps = {
  label: string;
  iconSrc?: string;
  className: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClassName = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-10 w-10 text-sm',
};

export function BrandAvatar({
  label,
  iconSrc,
  className,
  size = 'md',
}: BrandAvatarProps) {
  const [failedIconSrc, setFailedIconSrc] = useState<string | null>(null);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ${sizeClassName[size]} ${className}`}
    >
      {iconSrc && failedIconSrc !== iconSrc ? (
        <img
          src={iconSrc}
          alt={label}
          className="block h-full w-full object-contain p-1"
          onError={() => setFailedIconSrc(iconSrc)}
          draggable={false}
        />
      ) : (
        label
      )}
    </span>
  );
}
