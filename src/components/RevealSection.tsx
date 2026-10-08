import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { useReveal } from '../hooks/useReveal';

// revealOnFirstPaint: see useReveal's `firstPaint`.
type RevealSectionProps = ComponentPropsWithoutRef<'section'> & { revealOnFirstPaint?: boolean };

export const RevealSection = forwardRef<HTMLElement, RevealSectionProps>(function RevealSection(
  { style, className, revealOnFirstPaint = false, ...rest },
  forwardedRef
) {
  const { ref, style: revealStyle, className: revealClass } = useReveal<HTMLElement>(0, { firstPaint: revealOnFirstPaint });

  return (
    <section
      ref={(node) => {
        ref.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      style={{ ...revealStyle, ...style }}
      className={revealClass ? `${className ?? ''} ${revealClass}` : className}
      {...rest}
    />
  );
});
