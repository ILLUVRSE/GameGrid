'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid email or password');
      }
      router.push('/admin/shows');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f4f4f6'
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 340,
        padding: 32,
        borderRadius: 8,
        background: '#fff',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ marginBottom: 24, color: '#222', textAlign: 'center' }}>Login</h2>
        <label htmlFor="email" style={{ display: 'block', marginBottom: 6, color: '#333' }}>Email</label>
        <input
          id="email"
          type="email"
          value={email}
          autoComplete="username"
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: 10,
            marginBottom: 18,
            border: '1px solid #ccd',
            borderRadius: 4,
            fontSize: 16
          }}
          required
        />

        <label htmlFor="password" style={{ display: 'block', marginBottom: 6, color: '#333' }}>Password</label>
        <input
          id="password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={e => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: 10,
            marginBottom: 18,
            border: '1px solid #ccd',
            borderRadius: 4,
            fontSize: 16
          }}
          required
        />
        {error && (
          <div style={{
            background: '#ffe7e7',
            color: '#960000',
            padding: '8px 12px',
            borderRadius: 4,
            marginBottom: 18,
            fontSize: 14
          }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            background: '#2a5cff',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity .2s'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
