'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const initialMode = searchParams.get('mode') === 'signup';

  const { login, register, isAuthenticated, isAdmin, isSupport } = useAuth();

  const [isFlipped, setIsFlipped] = useState<boolean>(initialMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form fields
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin || isSupport) {
        router.push(redirectPath !== '/' ? redirectPath : '/admin');
      } else {
        router.push(redirectPath !== '/' ? redirectPath : '/account');
      }
    }
  }, [isAuthenticated, isAdmin, isSupport, router, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      await login({ email: loginEmail, password: loginPassword });
    } catch (err: any) {
      setErrorMessage(err.message || 'Identifiants invalides. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await register({
        email: signupEmail,
        password: signupPassword,
        firstName: signupFirstName,
        lastName: signupLastName,
        phoneNumber: signupPhone || undefined,
      });
      setSuccessMessage('Compte créé avec succès ! Un email de confirmation vous a été envoyé.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '90vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <video
        src="/image/video1.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          filter: 'brightness(0.5)',
        }}
      />

      <div
        className="container"
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '850px',
          width: '100%',
          background: 'var(--card, #fff)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex',
          minHeight: '520px',
        }}
      >
        {/* Cover side */}
        <div
          style={{
            flex: '1 1 45%',
            background: 'linear-gradient(135deg, #001b1a 0%, #00796b 100%)',
            color: '#fff',
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/image/logo1.png" alt="Logo" style={{ maxHeight: '60px', marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>
            {isFlipped ? 'REJOIGNEZ YUDING' : 'WELCOME TO YUDING'}
          </h2>
          <p style={{ fontSize: '1rem', color: '#b2dfdb', lineHeight: '1.6', maxWidth: '300px' }}>
            {isFlipped
              ? 'Créez votre compte en quelques clics pour débloquer les meilleures offres et gérer vos voyages.'
              : 'Connectez-vous pour accéder à vos réservations, vos offres personnalisées et votre historique.'}
          </p>
        </div>

        {/* Form side */}
        <div
          style={{
            flex: '1 1 55%',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'var(--card, #fff)',
          }}
        >
          {errorMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <i className="fas fa-exclamation-circle"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <i className="fas fa-check-circle"></i>
              <span>{successMessage}</span>
            </div>
          )}

          {!isFlipped ? (
            /* ==================== LOGIN FORM ==================== */
            <div>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text, #001b1a)', marginBottom: '1.5rem' }}>
                Connexion
              </h3>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Email ou Identifiant
                  </label>
                  <div style={{ position: 'relative' }}>
                    <i
                      className="fas fa-user-circle"
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}
                    ></i>
                    <input
                      type="text"
                      required
                      placeholder="votre@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Mot de passe
                  </label>
                  <div style={{ position: 'relative' }}>
                    <i
                      className="fas fa-lock"
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}
                    ></i>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-booking"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Se connecter'}
                </button>
              </form>

              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
                Pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => setIsFlipped(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00796b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Inscrivez-vous maintenant
                </button>
              </div>
            </div>
          ) : (
            /* ==================== SIGNUP FORM ==================== */
            <div>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text, #001b1a)', marginBottom: '1.25rem' }}>
                Créer un compte
              </h3>
              <form onSubmit={handleSignup}>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      required
                      placeholder="Prénom"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      required
                      placeholder="Nom"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="email"
                    required
                    placeholder="Adresse email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Mot de passe (8+ caractères)"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <input
                    type="tel"
                    placeholder="Numéro de téléphone"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-booking"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : "S'inscrire"}
                </button>
              </form>

              <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
                Vous avez déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00796b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Connectez-vous
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#00796b' }}></i>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
