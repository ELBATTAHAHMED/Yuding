import { redirect } from 'next/navigation';

export default function ApiUsageRedirect() {
  redirect('/admin/providers');
}
