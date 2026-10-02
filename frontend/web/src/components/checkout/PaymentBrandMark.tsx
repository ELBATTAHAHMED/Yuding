type PaymentBrand = 'visa' | 'mastercard' | 'paypal';

export function PaymentBrandMark({ brand }: { brand: PaymentBrand }) {
  if (brand === 'mastercard') {
    return <svg className="checkout-brand-mark checkout-brand-mark--mastercard" viewBox="0 0 48 30" role="img" aria-label="Mastercard">
      <circle cx="17" cy="15" r="14" fill="#EB001B" />
      <circle cx="31" cy="15" r="14" fill="#F79E1B" />
      <path d="M24 4.5A13.9 13.9 0 0 1 29.8 15 13.9 13.9 0 0 1 24 25.5 13.9 13.9 0 0 1 18.2 15 13.9 13.9 0 0 1 24 4.5Z" fill="#FF5F00" />
    </svg>;
  }

  if (brand === 'paypal') {
    return <span className="checkout-brand-mark checkout-brand-mark--paypal" role="img" aria-label="PayPal"><i className="fab fa-paypal" aria-hidden="true" /></span>;
  }

  return <svg className="checkout-brand-mark checkout-brand-mark--visa" viewBox="0 0 58 20" role="img" aria-label="Visa">
    <path d="M21.2 1.2L16.2 18.8H11.5L7.0 5.2C6.7 4.1 6.5 3.7 5.7 3.2C4.3 2.5 2.0 1.8 0.1 1.4L0.2 1.2H8.3C9.4 1.2 10.3 1.9 10.6 3.2L12.6 14.1L17.2 1.2H21.2ZM39.6 13.2C39.6 8.5 33.1 8.2 33.2 5.9C33.2 5.2 33.9 4.4 35.3 4.2C36.0 4.1 38.0 4.0 40.0 5.0L40.8 1.4C39.7 1.0 38.3 0.6 36.6 0.6C32.1 0.6 28.9 3.0 28.9 6.5C28.8 9.1 31.1 10.5 32.8 11.4C34.6 12.3 35.2 12.9 35.2 13.7C35.2 14.9 33.7 15.4 32.4 15.4C30.4 15.4 29.2 14.8 28.3 14.4L27.4 18.2C28.5 18.7 30.3 19.1 32.2 19.1C36.9 19.1 40.0 16.8 40.0 13.2M51.9 18.8H56L52.4 1.2H48.6C47.7 1.2 47.0 1.7 46.7 2.4L39.8 18.8H44.6L45.5 16.2H51.4ZM46.9 12.5L49.3 5.8L50.7 12.5H46.9ZM27.9 1.2L24.2 18.8H19.7L23.4 1.2H27.9Z" fill="#1434CB" />
    <path d="M8.3 1.2H0.2L0.1 1.4C4.1 2.3 7.3 4.2 8.3 7.8L9.8 1.2H8.3Z" fill="#F7B600" />
  </svg>;
}
