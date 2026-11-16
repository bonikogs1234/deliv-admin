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

  const input = 'w-full rounded border border-stone-300 px-3 py-2';
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100">
      <form onSubmit={submit} className="w-80 space-y-3 rounded border border-stone-300 bg-white p-6">
        <h1 className="text-lg font-semibold">Sign in to Deliv Admin</h1>
        <input className={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="block text-sm text-stone-600">
          Demo role
          <select className={input + ' mt-1'} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}
          </select>
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="w-full rounded bg-accent py-2 text-white">Sign in</button>
      </form>
    </div>
  );
}
