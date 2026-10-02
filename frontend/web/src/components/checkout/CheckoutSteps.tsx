import Link from 'next/link';

type CheckoutStep = 'booking' | 'payment' | 'confirmation';

const steps: { id: CheckoutStep; label: string }[] = [
  { id: 'booking', label: 'Réservation' },
  { id: 'payment', label: 'Paiement' },
  { id: 'confirmation', label: 'Confirmation' },
];

export function CheckoutSteps({ current, bookingHref }: { current: CheckoutStep; bookingHref?: string }) {
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <nav className="checkout-steps" aria-label="Étapes de la réservation">
      <ol>
        {steps.map((step, index) => {
          const content = <><span className="checkout-steps__number">{index + 1}</span><span>{step.label}</span></>;
          return (
            <li key={step.id} className={index === currentIndex ? 'is-current' : index < currentIndex ? 'is-complete' : ''}>
              {step.id === 'booking' && current === 'payment' && bookingHref
                ? <Link href={bookingHref} aria-label="Retour à la réservation">{content}</Link>
                : <span aria-current={index === currentIndex ? 'step' : undefined}>{content}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
