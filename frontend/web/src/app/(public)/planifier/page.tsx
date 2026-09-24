import React from 'react';
import { Metadata } from 'next';
import { PlanifierClient } from './PlanifierClient';

export const metadata: Metadata = {
  title: 'Planificateur de Voyage Intelligent | Yuding',
  description: 'Planifiez votre voyage sur mesure avec vols réels, hôtels, activités, météo et gestion stricte de votre budget.',
};

export default function PlanifierPage() {
  return <PlanifierClient />;
}
