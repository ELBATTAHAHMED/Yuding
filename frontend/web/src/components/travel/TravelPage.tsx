import React from 'react';

export function TravelPage({ children, page }: { children: React.ReactNode; page: string }) {
  return <div className={`travel-page travel-page--${page}`}>{children}</div>;
}
