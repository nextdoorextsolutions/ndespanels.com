import { ReactNode } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazyComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
}

/**
 * LazyComponent - Renders children only when visible in viewport
 * Uses Intersection Observer for progressive loading
 */
export function LazyComponent({
  children,
  fallback = null,
  rootMargin = '50px',
  threshold = 0.01,
}: LazyComponentProps) {
  const [ref, isVisible] = useIntersectionObserver({
    rootMargin,
    threshold,
    freezeOnceVisible: true,
  });

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
}
