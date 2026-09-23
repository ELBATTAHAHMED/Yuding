'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setSuccess(false);
      setMessage('Jeton de vérification manquant dans le lien.');
      return;
    }

    let isMounted = true;
    authService
      .verifyEmail(token)
      .then((res) => {
        if (isMounted) {
          setSuccess(true);
          setMessage(res.message || 'Votre adresse e-mail a été vérifiée avec succès !');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setSuccess(false);
          setMessage(err.message || 'Ce lien de vérification est invalide ou a expiré.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 mx-auto bg-teal-50 text-teal-700">
          {loading ? (
            <svg className="animate-spin h-8 w-8 text-teal-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : success ? (
            <span className="text-3xl">&#10003;</span>
          ) : (
            <span className="text-3xl text-rose-600">&#9888;</span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {loading ? 'Vérification en cours' : success ? 'Compte vérifié !' : 'Vérification impossible'}
        </h1>

        <p className="text-sm text-slate-600 mb-6">
          {loading ? 'Validation sécurisée de votre adresse e-mail en cours auprès de Yuding...' : message}
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full py-3 px-4 rounded-xl text-white font-semibold transition bg-[#01796F] hover:bg-[#005951]"
          >
            Se connecter
          </Link>
          <Link
            href="/"
            className="block w-full py-2.5 px-4 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition text-sm"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center text-slate-600">
          Chargement...
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
