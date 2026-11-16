import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { ROLES, type Role } from '../lib/permissions';

// Demo sign-in: any email and password works. Replace with POST /v1/admin/auth (password + TOTP).
export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('OWNER');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Enter your email and password.');
    login({ name: email.split('@')[0], email, role });
  };

  const field = 'mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm';
  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_28rem]">
      <div className="hidden flex-col justify-between bg-stone-900 p-10 text-stone-400 md:flex">
        <div className="flex items-center gap-2 text-white">
          <span className="grid h-8 w-8 place-items-center rounded bg-accent font-semibold">D</span>
          <span className="text-lg font-semibold">Deliv Admin</span>
        </div>
        <p className="max-w-sm text-3xl font-medium leading-snug text-white">Orders, couriers and merchants, in one place.</p>
        <p className="text-sm">Staff access only. Every action is recorded.</p>
      </div>
      <div className="flex items-center justify-center bg-stone-100 p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <label className="block text-sm text-stone-600">Email
            <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label className="block text-sm text-stone-600">Password
            <input className={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <label className="block text-sm text-stone-600">Demo role
            <select className={field} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}
            </select>
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="w-full rounded bg-accent py-2.5 font-medium text-white hover:bg-accent-dark">Sign in</button>
        </form>
      </div>
    </div>
  );
}