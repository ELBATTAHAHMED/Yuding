import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { PlanifierClient } from './PlanifierClient';

export const metadata: Metadata = {
  title: 'Planificateur de Voyage Intelligent | Yuding',
  description: 'Planifiez votre voyage sur mesure avec vols réels, hôtels, activités, météo et gestion stricte de votre budget.',
};

export default function PlanifierPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-20 text-center">
        <i className="fas fa-spinner fa-spin fa-2x text-emerald-600" aria-hidden="true" />
      </div>
    }>
      <PlanifierClient />
    </Suspense>
  );
}
