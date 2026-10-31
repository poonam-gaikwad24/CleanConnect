import type { ReactNode } from 'react';

// The standard surface. `padded` for ordinary content; pass padded={false}
// when the card contains its own dividers or a list that runs edge to edge.
function Card({ children, padded = true, className = '' }: { children: ReactNode; padded?: boolean; className?: string }) {
  return <div className={`card ${padded ? 'p-5' : ''} ${className}`}>{children}</div>;
}

export default Card;
