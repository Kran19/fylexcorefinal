"use client";
import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <>
      <style>{`
        footer.footer-v1 {
          background: #000000;
          padding: 60px clamp(20px, 5vw, 60px) 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          color: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .footer-grid-v1 {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 40px clamp(20px, 3vw, 50px);
          padding-bottom: 50px;
        }

        .footer-brand-v1 {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
        }

        .footer-logo-v1 {
          display: inline-block;
          text-decoration: none;
        }

        .footer-logo-v1 img {
          height: 22px;
          width: auto;
          display: block;
        }

        .footer-brand-tagline {
          font-size: 0.85rem;
          line-height: 1.5;
          color: #cccccc;
          margin: 0;
        }

        .footer-legal-ownership {
          font-size: 0.75rem;
          color: #888888;
          line-height: 1.5;
          margin: 0;
          max-width: 360px;
        }

        .footer-gst-badge {
          display: inline-flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 6px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          font-size: 0.72rem;
          color: #999B98;
          line-height: 1.4;
        }

        .footer-gst-badge span b {
          color: #ffffff;
          font-weight: 600;
        }

        .footer-col-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .footer-col-heading {
          font-family: 'Futura', 'Inter', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #ffffff;
          margin: 0;
          opacity: 0.95;
        }

        .footer-nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .footer-link-v1 {
          font-size: 0.78rem;
          font-weight: 400;
          color: #999B98;
          text-decoration: none;
          transition: color 0.2s, transform 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          line-height: 1.4;
        }

        .footer-link-v1:hover {
          color: #ffffff;
          transform: translateX(2px);
        }

        .footer-contact-item {
          font-size: 0.78rem;
          color: #999B98;
          line-height: 1.5;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: color 0.2s;
        }

        .footer-contact-item span.label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #666666;
        }

        .footer-contact-item:hover {
          color: #ffffff;
        }

        .footer-address-text {
          font-size: 0.78rem;
          color: #999B98;
          line-height: 1.6;
          margin: 0;
        }

        .footer-bottom-v1 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          padding-top: 26px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .footer-bottom-v1 p {
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #777777;
          margin: 0;
        }

        @media (max-width: 1024px) {
          .footer-grid-v1 {
            grid-template-columns: 1fr 1fr;
            gap: 40px 30px;
          }
        }

        @media (max-width: 640px) {
          footer.footer-v1 {
            padding: 40px 20px 24px;
          }
          .footer-grid-v1 {
            grid-template-columns: 1fr;
            gap: 32px;
            padding-bottom: 36px;
          }
          .footer-bottom-v1 {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>

      <footer className="footer-v1">
        <div className="footer-grid-v1">
          {/* Brand & Entity Info */}
          <div className="footer-brand-v1">
            <Link href="/" className="footer-logo-v1">
              <img src="/fylex_logo_name.png" alt="Fylex" />
            </Link>
            <p className="footer-legal-ownership">
              Fylex Watches and Radhika Times is a brand owned and operated by <strong>Rajeshbhai Mohanbhai Limbasiya</strong>.
            </p>
            <div className="footer-gst-badge">
              <span>Trade Name: <b>Radhika Times</b></span>
              <span>Legal Name: <b>Rajeshbhai Mohanbhai Limbasiya</b></span>
              <span>GSTIN: <b>24ABBPL7345R1Z6</b></span>
            </div>
          </div>

          {/* Registered Office */}
          <div className="footer-col-section">
            <h4 className="footer-col-heading">Registered Office</h4>
            <p className="footer-address-text">
              6/11 Patel Nagar,<br />
              80 Feet Road,<br />
              Rajkot, Gujarat - 360002,<br />
              India
            </p>
          </div>

          {/* Contact & Support */}
          <div className="footer-col-section">
            <h4 className="footer-col-heading">Support & Inquiries</h4>
            <ul className="footer-nav-list">
              <li>
                <a href="https://wa.me/919664653623" target="_blank" rel="noreferrer" className="footer-contact-item">
                  <span className="label">WhatsApp Support</span>
                  <span>+91 96646 53623</span>
                </a>
              </li>
              <li>
                <a href="mailto:Support@fylexwatches.com" className="footer-contact-item">
                  <span className="label">Business Email</span>
                  <span>Support@fylexwatches.com</span>
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/fylexwatch?igsh=MXA1MWljMWRkYXA5Ng==" target="_blank" rel="noreferrer" className="footer-link-v1">
                  Instagram &#8599;
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div className="footer-col-section">
            <h4 className="footer-col-heading">Legal & Policies</h4>
            <ul className="footer-nav-list">
              <li>
                <Link href="/policies/privacy" className="footer-link-v1">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/policies/terms" className="footer-link-v1">Terms & Conditions</Link>
              </li>
              <li>
                <Link href="/policies/refund" className="footer-link-v1">Refund & Exchange Policy</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="footer-bottom-v1">
          <p>&copy; 2026 <span style={{ fontWeight: 800, letterSpacing: '0.15em', color: '#ffffff' }}>FYLEX</span> &bull; Radhika Times. All rights reserved.</p>
          <p>Crafted with Intention</p>
        </div>
      </footer>
    </>
  );
};

export default Footer;
