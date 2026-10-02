'use client';

import React from 'react';
import { PaymentBrandMark } from './PaymentBrandMark';
import styles from './CardPreview.module.css';

export interface CardPreviewProps {
  /** Local-only visual data. The CVC is deliberately never passed to this component. */
  demoCard?: { holderName: string; displayNumber: string; expiry: string };
  isFlipped?: boolean;
  brand: 'visa' | 'mastercard';
  onToggleFlip?: () => void;
}

export const CardPreview: React.FC<CardPreviewProps> = ({ demoCard, isFlipped = false, brand, onToggleFlip }) => {
  const groups = (demoCard?.displayNumber || '').split(' ');
  const number = [0, 1, 2, 3].map((index) => groups[index] || '••••');

  return <div
    className={`${styles.preview} ${brand === 'visa' ? styles.visa : styles.mastercard}`}
    role={onToggleFlip ? 'button' : undefined}
    tabIndex={onToggleFlip ? 0 : undefined}
    aria-label={onToggleFlip ? `Afficher ${isFlipped ? 'le recto' : 'le verso'} de la carte de démonstration` : undefined}
    aria-pressed={onToggleFlip ? isFlipped : undefined}
    onClick={onToggleFlip}
    onKeyDown={onToggleFlip ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggleFlip(); } } : undefined}
  >
    <div className={`${styles.inner} ${isFlipped ? styles.flipped : ''}`}>
      <div className={styles.front} aria-hidden={isFlipped}>
        <div className={styles.top}>
          <div className={styles.cardTech}>
            <svg className={styles.chip} viewBox="0 0 42 31" aria-hidden="true"><rect x=".5" y=".5" width="41" height="30" rx="5" fill="#d8bb78" stroke="#f3dcaa"/><path d="M14 1v29M28 1v29M1 10.5h13M28 10.5h13M1 20.5h13M28 20.5h13" stroke="#9b7d46" fill="none"/><rect x="14" y="10.5" width="14" height="10" rx="2" fill="#e8cb89" stroke="#9b7d46"/></svg>
            <svg className={styles.contactless} viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 4.4a10 10 0 0 1 0 13.2M8.6 1.6a15.5 15.5 0 0 1 0 18.8M.4 7.6a5 5 0 0 1 0 6.8" /></svg>
          </div>
          <span className={styles.issuer}>YUDING<span>CARTE DÉMO</span></span>
        </div>
        <div className={styles.number} aria-label="Numéro de démonstration">{number.map((group, index) => <span key={index}>{group}</span>)}</div>
        <div className={styles.bottom}>
          <div className={styles.holder}><span>Titulaire</span><strong>{demoCard?.holderName || 'VOTRE NOM'}</strong></div>
          <div className={styles.expiry}><span>Expire fin</span><strong>{demoCard?.expiry || '••/••'}</strong></div>
          <div className={styles.scheme}><PaymentBrandMark brand={brand} /></div>
        </div>
      </div>
      <div className={styles.back} aria-hidden={!isFlipped}>
        <div className={styles.stripe} />
        <div className={styles.signature}><span>{demoCard?.holderName || 'Signature autorisée'}</span><strong>•••</strong></div>
        <p>Code de sécurité masqué · Carte de démonstration</p>
        <div className={styles.backBrand}><PaymentBrandMark brand={brand} /></div>
      </div>
    </div>
  </div>;
};
