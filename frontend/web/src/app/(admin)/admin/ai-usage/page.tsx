import { redirect } from 'next/navigation';

export default function AiUsageRedirect() {
  redirect('/admin/providers');
}
