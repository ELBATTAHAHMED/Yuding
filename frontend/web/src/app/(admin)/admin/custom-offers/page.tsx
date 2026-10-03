import { redirect } from 'next/navigation';

export default function CustomOffersRedirect() {
  redirect('/admin/bookings');
}
