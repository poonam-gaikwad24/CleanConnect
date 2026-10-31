import type { SVGProps } from 'react';

// A small set of inline icons (the project has no icon library, and adding
// one is not worth a dependency). All are decorative: aria-hidden, so the
// text beside them carries the meaning.
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps, children: React.ReactNode) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      className={props.className ?? 'h-4 w-4 shrink-0'}
    >
      {children}
    </svg>
  );
}

export const MenuIcon = (p: IconProps) => base(p, <path d="M3 5.5h14M3 10h14M3 14.5h14" />);
export const CloseIcon = (p: IconProps) => base(p, <path d="M5 5l10 10M15 5L5 15" />);
export const ChevronRightIcon = (p: IconProps) => base(p, <path d="M7.5 5l5 5-5 5" />);
export const ArrowLeftIcon = (p: IconProps) => base(p, <path d="M16 10H4M9 5l-5 5 5 5" />);
export const SearchIcon = (p: IconProps) =>
  base(p, <><circle cx="9" cy="9" r="5.5" /><path d="M13.2 13.2L17 17" /></>);
export const PinIcon = (p: IconProps) =>
  base(p, <><path d="M10 18s5.5-5.2 5.5-9.3a5.5 5.5 0 10-11 0C4.5 12.8 10 18 10 18z" /><circle cx="10" cy="8.7" r="2" /></>);
export const CheckCircleIcon = (p: IconProps) =>
  base(p, <><circle cx="10" cy="10" r="7.5" /><path d="M6.8 10.3l2.2 2.2 4.2-4.7" /></>);
export const AlertTriangleIcon = (p: IconProps) =>
  base(p, <><path d="M10 3.2l7.3 12.8H2.7L10 3.2z" /><path d="M10 8v3.6M10 13.8v.1" /></>);
export const InfoCircleIcon = (p: IconProps) =>
  base(p, <><circle cx="10" cy="10" r="7.5" /><path d="M10 9.2v4.6M10 6.4v.1" /></>);
export const XCircleIcon = (p: IconProps) =>
  base(p, <><circle cx="10" cy="10" r="7.5" /><path d="M7.5 7.5l5 5M12.5 7.5l-5 5" /></>);
export const ClockIcon = (p: IconProps) =>
  base(p, <><circle cx="10" cy="10" r="7.5" /><path d="M10 6v4.2l2.6 1.6" /></>);
export const WrenchIcon = (p: IconProps) =>
  base(p, <path d="M12.6 4.2a3.6 3.6 0 00-4.5 4.6L3.5 13.4a1.6 1.6 0 002.3 2.3l4.6-4.6a3.6 3.6 0 004.6-4.5l-2.1 2.1-1.9-.4-.4-1.9 2-2.2z" />);
export const ClipboardIcon = (p: IconProps) =>
  base(p, <><rect x="4.5" y="4" width="11" height="13" rx="1.5" /><path d="M7.5 4V3h5v1M7.5 9h5M7.5 12.5h5" /></>);
export const StarIcon = (p: IconProps) =>
  base(p, <path d="M10 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.8 5.8 16l.8-4.7L3.2 8l4.7-.7L10 3z" />);
export const UsersIcon = (p: IconProps) =>
  base(p, <><circle cx="7.5" cy="7" r="2.8" /><path d="M2.5 16c.4-2.6 2.4-4 5-4s4.6 1.4 5 4M13 4.4a2.8 2.8 0 010 5.2M14.5 12.2c1.6.5 2.6 1.7 3 3.8" /></>);
export const PlusIcon = (p: IconProps) => base(p, <path d="M10 4v12M4 10h12" />);
export const ExternalLinkIcon = (p: IconProps) =>
  base(p, <path d="M8 4H5a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-3M11 4h5v5M16 4l-7 7" />);
export const LogoutIcon = (p: IconProps) =>
  base(p, <path d="M8 4H5a1 1 0 00-1 1v10a1 1 0 001 1h3M12 6.5L15.5 10 12 13.5M15.5 10H8" />);

// The CleanConnect mark: a droplet with a leaf-like highlight.
export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="8" className="fill-brand-700" />
      <path d="M16 6.5c3.6 4.3 6.2 7.4 6.2 10.6a6.2 6.2 0 01-12.4 0c0-3.2 2.6-6.3 6.2-10.6z" fill="#fff" />
      <path d="M13.2 17.8c.4 1.6 1.6 2.7 3.3 3" fill="none" className="stroke-brand-700" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
