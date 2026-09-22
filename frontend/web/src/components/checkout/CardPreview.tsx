'use client';

import React from 'react';

export interface CardPreviewProps {
  cardHolder?: string;
  last4?: string;
  isFlipped?: boolean;
  brand: 'visa' | 'mastercard';
  onToggleFlip?: () => void;
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  cardHolder,
  last4,
  isFlipped = false,
  brand,
  onToggleFlip,
}) => {
  // Phase 39: PAN is permanently masked. Only safe provider-returned last4 may be displayed.
  const g1 = '••••';
  const g2 = '••••';
  const g3 = '••••';
  const g4 = last4 ? last4.slice(-4) : '••••';

  const isVisa = brand === 'visa';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '360px',
        margin: '0 auto',
        perspective: '1200px',
        userSelect: 'none',
        cursor: onToggleFlip ? 'pointer' : 'default',
      }}
      onClick={onToggleFlip}
      title={onToggleFlip ? 'Cliquer pour retourner la carte' : undefined}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1.586',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.75s cubic-bezier(0.34, 1.28, 0.48, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ==================== CARD FRONT ==================== */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: '18px',
            padding: '1.4rem 1.6rem',
            background: isVisa
              ? 'linear-gradient(135deg, #022421 0%, #015c54 45%, #01796F 85%, #02E0D5 125%)'
              : 'linear-gradient(135deg, #090d16 0%, #172033 45%, #1e293b 85%, #334155 125%)',
            color: '#ffffff',
            boxShadow: isVisa
              ? '0 18px 36px -10px rgba(1, 121, 111, 0.45), 0 4px 12px rgba(0, 0, 0, 0.15)'
              : '0 18px 36px -10px rgba(15, 23, 42, 0.55), 0 4px 12px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          {/* Subtle Decorative Guilloche / Sheen Overlays */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 90% 70% at 85% 15%, rgba(255, 255, 255, 0.14) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-30%',
              left: '-20%',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              background: isVisa
                ? 'radial-gradient(circle, rgba(2, 224, 213, 0.15) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(235, 0, 27, 0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top Row: Chip, Contactless Wave, and Issuer Branding */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {/* EMV Metallic Chip */}
              <svg
                width="40"
                height="30"
                viewBox="0 0 44 34"
                style={{ borderRadius: '5px', overflow: 'hidden', flexShrink: 0 }}
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="emv-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#facc15" />
                    <stop offset="75%" stopColor="#ca8a04" />
                    <stop offset="100%" stopColor="#854d0e" />
                  </linearGradient>
                </defs>
                <rect x="0.5" y="0.5" width="43" height="33" rx="4.5" fill="url(#emv-gold)" stroke="#a16207" strokeWidth="0.8" />
                {/* Milled contacts bevel lines */}
                <path d="M14 1v32M30 1v32" stroke="#713f12" strokeWidth="0.9" fill="none" opacity="0.75" />
                <path d="M1 11h13M30 11h13M1 23h13M30 23h13" stroke="#713f12" strokeWidth="0.9" fill="none" opacity="0.75" />
                <rect x="14" y="11" width="16" height="12" rx="2" fill="rgba(254, 240, 138, 0.35)" stroke="#713f12" strokeWidth="0.9" opacity="0.75" />
              </svg>

              {/* Contactless Wave */}
              <svg width="18" height="20" viewBox="0 0 20 22" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M4 4.4a10 10 0 0 1 0 13.2" />
                <path d="M8.6 1.6a15.5 15.5 0 0 1 0 18.8" />
                <path d="M.4 7.6a5 5 0 0 1 0 6.8" />
              </svg>
            </div>

            {/* Issuer + Tier */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '1.5px', lineHeight: 1 }}>
                YUDING
              </div>
              <div
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  letterSpacing: '1.2px',
                  color: isVisa ? '#02E0D5' : '#f59e0b',
                  marginTop: '2px',
                  textTransform: 'uppercase',
                }}
              >
                {isVisa ? 'Privilège' : 'World Elite'}
              </div>
            </div>
          </div>

          {/* Middle: Live Embossed PAN (Card Number) */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              fontFamily: "'Space Grotesk', 'Roboto Mono', monospace",
              fontSize: '1.28rem',
              fontWeight: 600,
              letterSpacing: '2.5px',
              display: 'flex',
              justifyContent: 'space-between',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.45)',
              margin: '0.4rem 0',
            }}
          >
            <span>{g1}</span>
            <span>{g2}</span>
            <span>{g3}</span>
            <span>{g4}</span>
          </div>

          {/* Bottom Row: Cardholder, Expiry, and Scheme Logo */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            {/* Cardholder */}
            <div style={{ flex: 1, minWidth: 0, marginRight: '1rem' }}>
              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.75, marginBottom: '2px' }}>
                Titulaire de la carte
              </div>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing: '0.5px',
                }}
              >
                {cardHolder || 'VOTRE NOM'}
              </div>
            </div>

            {/* Expiry: permanently masked decorative placeholder */}
            <div style={{ marginRight: '1.2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.75, marginBottom: '2px' }}>
                Expire fin
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}>
                ••/••
              </div>
            </div>

            {/* Brand Logo Mark */}
            <div style={{ width: '56px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              {isVisa ? (
                <svg width="54" height="20" viewBox="0 0 54 20" fill="none" aria-label="Visa">
                  <path
                    d="M21.2 1.2L16.2 18.8H11.5L7.0 5.2C6.7 4.1 6.5 3.7 5.7 3.2C4.3 2.5 2.0 1.8 0.1 1.4L0.2 1.2H8.3C9.4 1.2 10.3 1.9 10.6 3.2L12.6 14.1L17.2 1.2H21.2ZM39.6 13.2C39.6 8.5 33.1 8.2 33.2 5.9C33.2 5.2 33.9 4.4 35.3 4.2C36.0 4.1 38.0 4.0 40.0 5.0L40.8 1.4C39.7 1.0 38.3 0.6 36.6 0.6C32.1 0.6 28.9 3.0 28.9 6.5C28.8 9.1 31.1 10.5 32.8 11.4C34.6 12.3 35.2 12.9 35.2 13.7C35.2 14.9 33.7 15.4 32.4 15.4C30.4 15.4 29.2 14.8 28.3 14.4L27.4 18.2C28.5 18.7 30.3 19.1 32.2 19.1C36.9 19.1 40.0 16.8 40.0 13.2M51.9 18.8H56L52.4 1.2H48.6C47.7 1.2 47.0 1.7 46.7 2.4L39.8 18.8H44.6L45.5 16.2H51.4L51.9 18.8ZM46.9 12.5L49.3 5.8L50.7 12.5H46.9ZM27.9 1.2L24.2 18.8H19.7L23.4 1.2H27.9Z"
                    fill="#ffffff"
                  />
                  {/* Visa Gold Accent */}
                  <path d="M8.3 1.2H0.2L0.1 1.4C4.1 2.3 7.3 4.2 8.3 7.8L9.8 1.2H8.3Z" fill="#F79E1B" />
                </svg>
              ) : (
                <svg width="48" height="30" viewBox="0 0 48 30" fill="none" aria-label="Mastercard">
                  <circle cx="17" cy="15" r="14" fill="#EB001B" />
                  <circle cx="31" cy="15" r="14" fill="#F79E1B" />
                  <path
                    d="M24 4.5A13.9 13.9 0 0 1 29.8 15 13.9 13.9 0 0 1 24 25.5 13.9 13.9 0 0 1 18.2 15 13.9 13.9 0 0 1 24 4.5Z"
                    fill="#FF5F00"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* ==================== CARD BACK ==================== */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '18px',
            background: isVisa
              ? 'linear-gradient(135deg, #011816 0%, #013833 60%, #015c54 100%)'
              : 'linear-gradient(135deg, #090d16 0%, #111827 60%, #1e293b 100%)',
            color: '#ffffff',
            boxShadow: '0 18px 36px -10px rgba(0, 0, 0, 0.55)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingTop: '1.25rem',
            paddingBottom: '1.2rem',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Black Magnetic Stripe */}
          <div
            style={{
              width: '100%',
              height: '42px',
              background: '#0a0a0c',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          />

          {/* Signature Strip & CVC */}
          <div style={{ padding: '0 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* Stylized Signature Strip */}
              <div
                style={{
                  flex: 1,
                  height: '36px',
                  background: 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)',
                  borderRadius: '4px 0 0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '0.8rem',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Brush Script MT', cursive, sans-serif",
                    color: '#64748b',
                    fontSize: '0.95rem',
                    fontStyle: 'italic',
                  }}
                >
                  {cardHolder || 'Signature autorisée'}
                </span>
              </div>

              {/* CVC Box: permanently masked */}
              <div
                style={{
                  width: '64px',
                  height: '36px',
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '0 4px 4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  letterSpacing: '2px',
                  boxShadow: 'inset 0 0 3px rgba(0,0,0,0.2)',
                }}
              >
                •••
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '4px', fontSize: '0.62rem', opacity: 0.7, textTransform: 'uppercase' }}>
              Cryptogramme (CVC)
            </div>
          </div>

          {/* Bottom Fine Print & Hologram */}
          <div
            style={{
              padding: '0 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <p
              style={{
                fontSize: '0.55rem',
                lineHeight: 1.35,
                color: 'rgba(255, 255, 255, 0.65)',
                margin: 0,
                maxWidth: '220px',
              }}
            >
              Carte émise pour la plateforme Yuding V2. Transaction sécurisée de bout en bout sans conservation du cryptogramme visuel.
            </p>

            {/* Small Scheme mark watermark on back */}
            <div style={{ opacity: 0.8 }}>
              {isVisa ? (
                <span style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '1px' }}>VISA</span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#EB001B' }} />
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#F79E1B', marginLeft: '-6px' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
