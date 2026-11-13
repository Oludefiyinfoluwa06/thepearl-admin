import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import ForgotForm from './ForgotForm';

export const metadata = { title: 'Reset password — The Pearl Admin' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password">
      <p className="text-sm text-gray-600 mb-5">Enter your email and we will send you a link to choose a new password.</p>
      <ForgotForm />
      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="text-navy font-semibold hover:text-gold">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
