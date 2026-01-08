import Head from 'next/head';
import Link from 'next/link';
import { ReactNode } from 'react';

export default function AppShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Head>
        <title>{`${title} • FBLeadsPro`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        style={{
          minHeight: '100vh',
          background: '#f5f7ff',
          color: '#0b2b6f',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0b2b6f 0%, #2f80ed 100%)',
            color: '#fff',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              padding: '18px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 900, letterSpacing: 0.2 }}>
                  FBLeadsPro
                </Link>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.16)',
                    border: '1px solid rgba(255,255,255,0.22)',
                  }}
                >
                  Dashboard
                </span>
              </div>

              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.15 }}>{title}</div>
              {subtitle ? (
                <div style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.35, maxWidth: 720 }}>
                  {subtitle}
                </div>
              ) : null}
            </div>

            {/* Right actions ONLY (page controls like Export/Refresh/etc) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{right}</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px' }}>{children}</div>

        {/* Footer */}
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
          Built for Facebook lead capture • Export CSV • Track follow-ups
        </div>
      </div>
    </>
  );
}
