import React from 'react';

export const DetailLoadingSkeleton: React.FC = () => {
  return (
    <div className="travel-details-shell travel-details-loading min-h-screen">
      <div className="travel-details-shell__inner mx-auto flex flex-col gap-8">
        <div className="travel-details-loading__back animate-pulse" />

        <div className="travel-details-shell__grid grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="flex flex-col gap-6">
            <div className="travel-details-loading__card animate-pulse">
              <div className="travel-details-loading__icon" />
              <div className="travel-details-loading__copy">
                <div className="travel-details-loading__line travel-details-loading__line--title" />
                <div className="travel-details-loading__line travel-details-loading__line--subtitle" />
              </div>
            </div>

            <div className="travel-details-loading__card travel-details-loading__body animate-pulse">
              <div className="travel-details-loading__line travel-details-loading__line--heading" />
              <div className="travel-details-loading__block" />
              <div className="travel-details-loading__block" />
            </div>
          </div>

          <div className="travel-details-loading__card travel-details-loading__sidebar animate-pulse">
            <div className="travel-details-loading__line travel-details-loading__line--heading" />
            <div className="travel-details-loading__line travel-details-loading__line--price" />
            <div className="travel-details-loading__block travel-details-loading__block--cta" />
          </div>
        </div>
      </div>
    </div>
  );
};
