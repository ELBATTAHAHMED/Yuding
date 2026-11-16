'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/lib/api-client';
import { Header } from '@/components/layout/Header';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || searchParams.get('returnUrl');
  const initialMode = searchParams.get('mode') === 'signup';
  const resetEmailParam = searchParams.get('resetEmail') || '';
  const resetCodeParam = searchParams.get('resetCode') || '';

  const { login, register, isAuthenticated, isAdmin, isSupport } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode ? 'signup' : 'login');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password fields
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotVerifyLoading, setForgotVerifyLoading] = useState(false);
  const [forgotResetLoading, setForgotResetLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Signup form fields
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');

  // The shared header owns theme changes; this state only selects the form artwork.
  useEffect(() => {
    document.body.classList.add('auth-body');
    const savedTheme = localStorage.getItem('yuding_theme') || localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkActive = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

    setIsDark(darkActive);

    return () => {
      document.body.classList.remove('auth-body');
    };
  }, []);

  useEffect(() => {
    if (!/^\d{6}$/.test(resetCodeParam)) return;
    setShowForgotPassword(true);
    setForgotStep('verify');
    setForgotEmail(resetEmailParam);
    setForgotCode(resetCodeParam);
    setForgotMessage('Votre code est prêt à être vérifié.');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(resetCodeParam).catch(() => undefined);
    }
  }, [resetCodeParam, resetEmailParam]);

  // Safe redirect URL calculation
  const getSafeRedirectUrl = () => {
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      return redirectParam;
    }
    if (isAdmin || isSupport) {
      return '/admin';
    }
    return '/';
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.push(getSafeRedirectUrl());
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await login({ email: loginEmail.trim(), password: loginPassword });
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        setErrorMessage('Email ou mot de passe incorrect. Vérifiez vos identifiants puis réessayez.');
      } else if (err instanceof ApiError && err.status === 423) {
        setErrorMessage('Ce compte est temporairement verrouillé. Réessayez plus tard.');
      } else {
        setErrorMessage(err.message || 'Impossible de vous connecter pour le moment. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotMessage(null);
    setForgotError(null);
    try {
      await authService.forgotPassword(forgotEmail.trim());
      setForgotStep('verify');
      setForgotMessage("Si cette adresse correspond à un compte, le code vient d’être envoyé.");
    } catch (err: any) {
      setForgotError(err.message || 'Impossible d’envoyer le code pour le moment. Réessayez.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotVerifyLoading(true);
    try {
      await authService.verifyPasswordResetCode(forgotEmail.trim(), forgotCode.trim());
      setForgotStep('reset');
      setForgotMessage('Code vérifié. Choisissez votre nouveau mot de passe.');
    } catch (err: any) {
      setForgotError(err.message || 'Code invalide ou expiré.');
    } finally {
      setForgotVerifyLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (forgotNewPassword.length < 8) {
      setForgotError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Les mots de passe ne correspondent pas.');
      return;
    }
    setForgotResetLoading(true);
    try {
      await authService.resetPassword(forgotCode.trim(), forgotNewPassword);
      setShowForgotPassword(false);
      setForgotStep('request');
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setSuccessMessage('Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.');
    } catch (err: any) {
      setForgotError(err.message || 'Impossible de réinitialiser le mot de passe.');
    } finally {
      setForgotResetLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (signupPassword !== signupPasswordConfirm) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    if (signupPassword.length < 8) {
      setErrorMessage('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: signupEmail.trim(),
        password: signupPassword,
        firstName: signupFirstName.trim(),
        lastName: signupLastName.trim(),
        phoneNumber: signupPhone.trim() || undefined,
      });
      setSuccessMessage('Compte créé avec succès ! Bienvenue sur YUDING !');
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec de l\'inscription. Veuillez vérifier vos informations et réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const isFlipped = mode === 'signup';

  useEffect(() => {
    const signupForm = document.querySelector<HTMLElement>('.auth-container .signup-form');
    signupForm?.scrollTo({ top: 0, behavior: 'auto' });
  }, [mode]);

  return (
    <>
      <Header hideLogin onThemeChange={setIsDark} />

      <div className="auth-bg-media" aria-hidden="true" />

      {/* ==================== CENTERED AUTH CONTAINER ==================== */}
      <div className="auth-layout-root">
        <div className={`container auth-container ${isFlipped ? 'signup-mode' : 'login-mode'}`}>
        {/* Checkbox pour compatibilité CSS flip */}
        <input
          type="checkbox"
          id="flip"
          checked={isFlipped}
          onChange={(e) => {
            setMode(e.target.checked ? 'signup' : 'login');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
        />

        {/* Couverture (images + textes) */}
        <div className={`cover ${isFlipped ? 'flipped' : ''}`}>
          <div className="front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isDark ? '/image/pic2.jpg' : '/image/pic1.jpg'}
              alt="Image Front"
              id="coverFrontImage"
            />
            <div className="text">
              <span className="text-1">Bienvenue<br />chez Yuding</span>
              <span className="text-2">Vos voyages, à votre rythme.</span>
            </div>
          </div>
          <div className="back">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="backImg"
              src={isDark ? '/image/img1.png' : '/image/img.png'}
              alt="Image Back"
              id="coverBackImage"
            />
            <div className="text">
              <span className="text-1">Créez votre<br />espace voyageur</span>
              <span className="text-2">Préparez votre prochain départ.</span>
            </div>
          </div>
        </div>

        {/* Zone des formulaires */}
        <div className={`forms ${isFlipped ? 'flipped' : ''}`}>
          <div className="form-content">
            {/* =========== LOGIN FORM =========== */}
            <div className="login-form">
              <div className="title">{showForgotPassword ? 'Réinitialisation' : 'Connexion'}</div>
              {showForgotPassword ? (
                <>
                  {forgotMessage && (
                    <div className="auth-alert auth-alert-success" role="alert">
                      <i className="fas fa-check" aria-hidden="true"></i>
                      <span>{forgotMessage}</span>
                    </div>
                  )}
                  {forgotError && (
                    <div className="auth-alert auth-alert-error" role="alert">
                      <i className="fas fa-exclamation" aria-hidden="true"></i>
                      <span>{forgotError}</span>
                    </div>
                  )}
                  {forgotStep === 'request' && (
                    <form id="forgot-form" method="post" onSubmit={handleForgotPassword}>
                      <div className="input-boxes">
                        <p className="auth-form-helper">Saisissez votre adresse e-mail pour recevoir un code de vérification.</p>
                        <div className="input-box">
                          <i className="fas fa-envelope"></i>
                          <input
                            type="email"
                            id="forgot-email"
                            name="email"
                            placeholder="Votre adresse e-mail"
                            autoComplete="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="button input-box">
                          <input type="submit" value={forgotLoading ? 'Envoi en cours...' : 'Envoyer le code'} className="btn" disabled={forgotLoading} />
                        </div>
                      </div>
                    </form>
                  )}
                  {forgotStep === 'verify' && (
                    <form id="forgot-code-form" method="post" onSubmit={handleVerifyForgotCode}>
                      <div className="input-boxes">
                        <p className="auth-form-helper">Saisissez le code reçu par e-mail pour continuer.</p>
                        <div className="input-box">
                          <i className="fas fa-key"></i>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            placeholder="Code à 6 chiffres"
                            value={forgotCode}
                            onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                          />
                        </div>
                        <div className="button input-box">
                          <input type="submit" value={forgotVerifyLoading ? 'Vérification...' : 'Vérifier le code'} className="btn" disabled={forgotVerifyLoading || forgotCode.length !== 6} />
                        </div>
                      </div>
                    </form>
                  )}
                  {forgotStep === 'reset' && (
                    <form id="forgot-reset-form" method="post" onSubmit={handleForgotReset}>
                      <div className="input-boxes">
                        <p className="auth-form-helper">Choisissez votre nouveau mot de passe sécurisé.</p>
                        <div className="input-box">
                          <i className="fas fa-lock"></i>
                          <input type="password" minLength={8} placeholder="Nouveau mot de passe" value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)} required />
                        </div>
                        <div className="input-box">
                          <i className="fas fa-lock"></i>
                          <input type="password" minLength={8} placeholder="Confirmer le mot de passe" value={forgotConfirmPassword} onChange={(e) => setForgotConfirmPassword(e.target.value)} required />
                        </div>
                        <div className="button input-box">
                          <input type="submit" value={forgotResetLoading ? 'Mise à jour...' : 'Enregistrer le mot de passe'} className="btn" disabled={forgotResetLoading} />
                        </div>
                      </div>
                    </form>
                  )}
                  <div className="text sign-up-text">
                    <button
                      type="button"
                      className="auth-switch-link"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotStep('request');
                        setForgotMessage(null);
                        setForgotError(null);
                      }}
                    >
                      Retour à la connexion
                    </button>
                  </div>
                </>
              ) : (
                <form id="login-form" method="post" onSubmit={handleLogin}>
                  <div className="input-boxes">
                    {errorMessage && !isFlipped && (
                      <div className="auth-alert auth-alert-error" role="alert">
                        <i className="fas fa-exclamation" aria-hidden="true"></i>
                        <span>{errorMessage}</span>
                      </div>
                    )}
                    {successMessage && !isFlipped && (
                      <div className="auth-alert auth-alert-success" role="alert">
                        <i className="fas fa-check" aria-hidden="true"></i>
                        <span>{successMessage}</span>
                      </div>
                    )}
                    <div className="input-box">
                      <i className="fas fa-envelope"></i>
                      <input
                        type="email"
                        id="login-email"
                        name="email"
                        placeholder="Votre adresse e-mail"
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="input-box">
                      <i className="fas fa-lock"></i>
                      <input
                        type="password"
                        id="login-password"
                        name="password"
                        placeholder="Votre mot de passe"
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="text" style={{ textAlign: 'right', marginTop: '4px', marginBottom: '8px' }}>
                      <button
                        type="button"
                        className="auth-switch-link"
                        style={{ fontSize: '13px', textDecoration: 'none' }}
                        onClick={() => {
                          setShowForgotPassword(true);
                          setForgotMessage(null);
                        }}
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="button input-box">
                      <input
                        type="submit"
                        value={loading ? 'Connexion en cours…' : 'Se connecter'}
                        className="btn"
                        disabled={loading}
                      />
                    </div>
                    <div className="text sign-up-text">
                      Pas encore de compte&nbsp;?{' '}
                      <button
                        type="button"
                        className="auth-switch-link"
                        onClick={() => {
                          setMode('signup');
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                      >
                      Créer un compte
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* =========== SIGNUP FORM =========== */}
            <div className="signup-form">
              <div className="title">Créer un compte</div>
              <form id="signup-form" method="post" onSubmit={handleSignup}>
                <div className="input-boxes">
                  {errorMessage && isFlipped && (
                    <div className="auth-alert auth-alert-error" role="alert">
                      <i className="fas fa-exclamation" aria-hidden="true"></i>
                      <span>{errorMessage}</span>
                    </div>
                  )}
                  {successMessage && isFlipped && (
                    <div className="auth-alert auth-alert-success" role="alert">
                      <i className="fas fa-check" aria-hidden="true"></i>
                      <span>{successMessage}</span>
                    </div>
                  )}
                  {/* Nom */}
                  <div className="input-box">
                    <i className="fas fa-user"></i>
                    <input
                      type="text"
                      name="nom_utilisateur"
                      placeholder="Nom"
                      autoComplete="family-name"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      required
                    />
                  </div>
                  {/* Prénom */}
                  <div className="input-box">
                    <i className="fas fa-user"></i>
                    <input
                      type="text"
                      name="prenom_utilisateur"
                      placeholder="Prénom"
                      autoComplete="given-name"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      required
                    />
                  </div>
                  {/* Email */}
                  <div className="input-box">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      name="email_utilisateur"
                      placeholder="Email"
                      autoComplete="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  {/* Téléphone */}
                  <div className="input-box">
                    <i className="fas fa-phone"></i>
                    <input
                      type="tel"
                      name="num_tele"
                      placeholder="Téléphone"
                      autoComplete="tel"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                    />
                  </div>
                  {/* Password */}
                  <div className="input-box">
                    <i className="fas fa-lock"></i>
                    <input
                      type="password"
                      name="password"
                      placeholder="Mot de passe (8 caractères min.)"
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                  {/* Confirmer Password */}
                  <div className="input-box">
                    <i className="fas fa-lock"></i>
                    <input
                      type="password"
                      name="password_confirm"
                      placeholder="Confirmer le mot de passe"
                      autoComplete="new-password"
                      value={signupPasswordConfirm}
                      onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                  {/* Bouton Submit */}
                  <div className="button input-box">
                    <input
                      type="submit"
                      value={loading ? 'Inscription en cours…' : 'Créer mon compte'}
                      disabled={loading}
                    />
                  </div>
                  <div className="text sign-up-text">
                    Déjà un compte&nbsp;?{' '}
                    <button
                      type="button"
                      className="auth-switch-link"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                    >
                    Se connecter
                    </button>
                  </div>
                </div>
              </form>
            </div>
            {/* /signup-form */}
          </div>
          {/* /form-content */}
        </div>
        {/* /forms */}
      </div>
      {/* /container */}
      </div>
      {/* /auth-layout-root */}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0f766e' }}></i>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
