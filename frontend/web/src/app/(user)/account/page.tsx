import { redirect } from 'next/navigation';

/**
 * Backward compatibility redirect for /account -> /account/profile
 */
export default function AccountIndexPage() {
  redirect('/account/profile');
}
