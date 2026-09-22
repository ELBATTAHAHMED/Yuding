'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || searchParams.get('returnUrl');
  const initialMode = searchParams.get('mode') === 'signup';

  const { login, register, isAuthenticated, isAdmin, isSupport } = useAuth();

  const [isFlipped, setIsFlipped] = useState<boolean>(initialMode);
  const [isDark, setIsDark] = useState<boolean>(false);
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
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');

  // Initialize and listen to Dark Mode
  useEffect(() => {
    document.body.classList.add('auth-body');
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkActive = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

    setIsDark(darkActive);
    applyTheme(darkActive);

    return () => {
      document.body.classList.remove('auth-body');
    };
  }, []);

  const applyTheme = (dark: boolean) => {
    const html = document.documentElement;
    const body = document.body;
    if (dark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
      body.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.removeAttribute('data-theme');
      body.setAttribute('data-theme', 'light');
    }
  };

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    applyTheme(nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
  };

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
      setErrorMessage(err.message || 'Identifiants invalides. Veuillez vérifier votre email et mot de passe.');
    } finally {
      setLoading(false);
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

  return (
    <>
      {/* ==================== HEADER ==================== */}
      <header className="header">
        <div className="header-top">
          <div className="container1">
            <Link href="/" className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={isDark ? '/image/logo1.png' : '/image/logodark.png'}
                alt="Yuding Logo"
                id="headerLogo"
              />
            </Link>

            <nav className="header-nav">
              <Link href="/" className="nav-item">
                <i className="fas fa-home"></i> Accueil
              </Link>
              <Link href="/hotels" className="nav-item">
                <i className="fas fa-bed"></i> Hébergements
              </Link>
              <Link href="/#gallery" className="nav-item">
                <i className="fas fa-images"></i> Galerie
              </Link>
            </nav>

            {/* Bouton Dark Mode */}
            <button
              id="darkModeToggle"
              className={`dark-mode-toggle ${isDark ? 'active' : ''}`}
              title="Basculer le mode sombre"
              onClick={toggleDarkMode}
              type="button"
            >
              <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} id="darkModeIcon"></i>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== VIDEO BACKGROUND ==================== */}
      <section className="home" id="home">
        <video
          src="/image/video1.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="video"
        ></video>
      </section>

      {/* ==================== 3D FLIP CONTAINER ==================== */}
      <div className="container auth-container">
        {/* Checkbox pour l'effet flip */}
        <input
          type="checkbox"
          id="flip"
          checked={isFlipped}
          onChange={(e) => setIsFlipped(e.target.checked)}
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
              <span className="text-1">WELCOME TO<br /> YUDDING</span>
              <span className="text-2">Let&apos;s get connected</span>
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
              <span className="text-1">WELCOME TO<br />YUDDING</span>
              <span className="text-2">Signup Now</span>
            </div>
          </div>
        </div>

        {/* Zone des formulaires */}
        <div className={`forms ${isFlipped ? 'flipped' : ''}`}>
          <div className="form-content">
            {/* =========== LOGIN FORM =========== */}
            <div className="login-form">
              <div className="title">Login</div>
              <form id="login-form" onSubmit={handleLogin}>
                <div className="input-boxes">
                  {errorMessage && !isFlipped && (
                    <div className="auth-alert auth-alert-error" role="alert">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{errorMessage}</span>
                    </div>
                  )}
                  {successMessage && !isFlipped && (
                    <div className="auth-alert auth-alert-success" role="alert">
                      <i className="fas fa-check-circle"></i>
                      <span>{successMessage}</span>
                    </div>
                  )}
                  <div className="input-box">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      id="login-email"
                      name="email"
                      placeholder="Enter your email"
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
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="button input-box">
                    <input
                      type="submit"
                      value={loading ? 'Connexion en cours...' : 'Submit'}
                      className="btn"
                      disabled={loading}
                    />
                  </div>
                  <div className="text sign-up-text">
                    Don&apos;t have an account?{' '}
                    <label
                      htmlFor="flip"
                      onClick={() => {
                        setIsFlipped(true);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                    >
                      Signup now
                    </label>
                  </div>
                </div>
              </form>
            </div>

            {/* =========== SIGNUP FORM =========== */}
            <div className="signup-form">
              <div className="title">Signup</div>
              <form id="signup-form" onSubmit={handleSignup}>
                <div className="input-boxes">
                  {errorMessage && isFlipped && (
                    <div className="auth-alert auth-alert-error" role="alert">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{errorMessage}</span>
                    </div>
                  )}
                  {successMessage && isFlipped && (
                    <div className="auth-alert auth-alert-success" role="alert">
                      <i className="fas fa-check-circle"></i>
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
                      placeholder="Password (min. 8 caractères)"
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
                      placeholder="Confirmer Password"
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
                      value={loading ? 'Inscription en cours...' : 'Submit'}
                      disabled={loading}
                    />
                  </div>
                  <div className="text sign-up-text">
                    Already have an account?{' '}
                    <label
                      htmlFor="flip"
                      onClick={() => {
                        setIsFlipped(false);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                    >
                      Login now
                    </label>
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
