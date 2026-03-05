import React, { useState } from 'react';
import { useCMS } from '../provider';

export function Login() {
  const { login, config } = useCMS();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const businessName = config.branding?.businessName || 'CMS';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bcms-min-h-screen bcms-flex bcms-items-center bcms-justify-center bcms-bg-gray-50 bcms-p-4">
      <div className="bcms-w-full bcms-max-w-md">
        <div className="bcms-text-center bcms-mb-8">
          {config.branding?.logoUrl ? (
            <img src={config.branding.logoUrl} alt={businessName} className="bcms-h-12 bcms-mx-auto bcms-mb-4" />
          ) : (
            <h1 className="bcms-text-3xl bcms-font-bold bcms-text-gray-900 bcms-mb-2">{businessName}</h1>
          )}
          <p className="bcms-text-gray-500 bcms-text-sm">Sign in to your admin panel</p>
        </div>

        <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-8">
          {error && (
            <div className="bcms-bg-red-50 bcms-border bcms-border-red-200 bcms-text-red-700 bcms-px-4 bcms-py-3 bcms-rounded-lg bcms-text-sm bcms-mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bcms-space-y-5">
            <div>
              <label className="bcms-block bcms-text-sm bcms-font-semibold bcms-text-gray-700 bcms-mb-2">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="bcms-w-full bcms-px-4 bcms-py-2.5 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500 bcms-transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="bcms-block bcms-text-sm bcms-font-semibold bcms-text-gray-700 bcms-mb-2">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="bcms-w-full bcms-px-4 bcms-py-2.5 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg focus:bcms-ring-2 focus:bcms-ring-blue-500 focus:bcms-border-blue-500 bcms-transition"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="bcms-w-full bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-px-6 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition disabled:bcms-opacity-50 disabled:bcms-cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
