import Link from "next/link";
import React from "react";
import { useRouter } from "next/router";

type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
};

export default function SiteShell({ title, subtitle, rightSlot, children }: Props) {
  const router = useRouter();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/dashboard/contacts", label: "Dashboard" },
  ];

  const isActive = (href: string) => {
    const p = router.pathname || "";
    if (href === "/") return p === "/";
    return p === href || p.startsWith(href);
  };

  return (
    <div className="page">
      {/* Top Header */}
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <div className="mark" aria-hidden="true" />
            <div className="brandText">
              <div className="brandName">FBLeadsPro</div>
              <div className="brandTag">Facebook Lead Capture</div>
            </div>
          </div>

          <nav className="nav" aria-label="Primary">
            {navItems.map((it) => (
              <Link key={it.href} href={it.href} legacyBehavior>
                <a className={`navLink ${isActive(it.href) ? "navLinkActive" : ""}`}>
                  {it.label}
                </a>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Subheader */}
      <section className="subheader">
        <div className="subheaderInner">
          <div className="subLeft">
            <h1 className="h1">{title}</h1>
            {subtitle ? <p className="sub">{subtitle}</p> : null}
          </div>
          <div className="subRight">{rightSlot}</div>
        </div>
      </section>

      {/* Main */}
      <main className="main">
        <div className="card">{children}</div>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f6f8fb;
          color: #0f172a;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica,
            Arial, "Apple Color Emoji", "Segoe UI Emoji";
        }

        /* Header */
        .topbar {
          background: linear-gradient(90deg, #0b5ed7 0%, #0aa2c0 55%, #1b6ef3 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        }
        .topbarInner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 180px;
        }
        .mark {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.18);
        }
        .brandText {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .brandName {
          color: #fff;
          font-weight: 900;
          letter-spacing: 0.2px;
          font-size: 14px;
        }
        .brandTag {
          color: rgba(255, 255, 255, 0.88);
          font-size: 12px;
          font-weight: 600;
          margin-top: 2px;
        }

        .nav {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .navLink {
          color: rgba(255, 255, 255, 0.92);
          text-decoration: none;
          font-weight: 800;
          font-size: 13px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.08);
        }
        .navLink:visited {
          color: rgba(255, 255, 255, 0.92);
        }
        .navLink:hover {
          background: rgba(255, 255, 255, 0.14);
        }
        .navLinkActive {
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.28);
        }

        /* Subheader */
        .subheader {
          background: #ffffff;
          border-bottom: 1px solid #e6edf7;
        }
        .subheaderInner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 18px 18px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .subLeft {
          min-width: 240px;
        }
        .h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.3px;
        }
        .sub {
          margin: 8px 0 0 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.5;
          max-width: 760px;
        }
        .subRight {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Content */
        .main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 18px;
        }
        .card {
          background: #fff;
          border: 1px solid #e6edf7;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }

        @media (max-width: 560px) {
          .h1 {
            font-size: 22px;
          }
          .topbarInner {
            padding: 12px 14px;
          }
          .subheaderInner {
            padding: 14px 14px;
          }
          .main {
            padding: 14px;
          }
        }
      `}</style>
    </div>
  );
}
