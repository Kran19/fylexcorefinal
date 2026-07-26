import React from "react";

export const metadata = {
  title: "Privacy Policy | FYLEX",
  description: "Privacy policy for FYLEX platforms.",
};

export default function PrivacyPolicy() {
  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', width: '100%' }}>
      <div className="policy-container" style={{ maxWidth: "800px", margin: "0 auto", padding: "140px 20px 80px", lineHeight: "1.8", color: "#ccc", fontFamily: "Avenir, 'Neue Haas Grotesk Display Pro', Inter, sans-serif", fontWeight: "300" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "30px", textTransform: "uppercase", letterSpacing: "4px", color: "#fff", textAlign: "center", fontWeight: "300" }}>Privacy Policy</h1>
        <p style={{ marginBottom: "30px", fontSize: "1.1rem" }}>
        FYLEX respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and handle information when you visit our website or place an order with us. By using FYLEX platforms, you agree to the terms outlined below.
      </p>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>1. Information We Collect</h2>
        <p>When you place an order or interact with FYLEX, we may collect:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Your name</li>
          <li>Phone number</li>
          <li>Email address</li>
          <li>Birthday</li>
          <li>Shipping and billing address</li>
          <li>Payment-related information</li>
          <li>And order details</li>
        </ul>
        <p>We may also collect basic technical information such as:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Device type</li>
          <li>Browser information</li>
          <li>IP address</li>
          <li>And website activity data</li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>2. How We Use Information</h2>
        <p>Your information may be used to:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Process and deliver orders</li>
          <li>Provide customer support</li>
          <li>Send order and shipping updates</li>
          <li>Improve website experience and performance</li>
          <li>Prevent fraudulent activity</li>
          <li>And share product or promotional updates where permitted</li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>3. Payments</h2>
        <p>
          Payments on FYLEX are processed through secure third-party payment providers. FYLEX does not store complete debit card, credit card, UPI, or banking details on its own servers.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>4. Cookies</h2>
        <p>
          FYLEX may use cookies and similar technologies to improve website functionality, understand user activity, and enhance browsing experience. You may disable cookies through your browser settings if preferred.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>5. Sharing of Information</h2>
        <p>FYLEX does not sell customer personal information. Information may be shared with trusted third-party service providers only where necessary for:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Payment processing</li>
          <li>Shipping and delivery</li>
          <li>Customer support</li>
          <li>Analytics</li>
          <li>Or legal compliance</li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>6. Marketing Communication</h2>
        <p>If you choose to subscribe, FYLEX may send updates regarding:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>New launches</li>
          <li>Offers</li>
          <li>And brand-related communication</li>
        </ul>
        <p>You may opt out of marketing communication at any time using the unsubscribe option or by contacting us directly.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>7. Data Security</h2>
        <p>
          FYLEX takes reasonable measures to protect customer information from unauthorized access, misuse, or disclosure. However, no online platform can guarantee complete security.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>8. Third-Party Links</h2>
        <p>
          Our website may contain links to third-party platforms or services. FYLEX is not responsible for the privacy practices or content of such external websites.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>9. Policy Updates</h2>
        <p>
          FYLEX may update this Privacy Policy from time to time. Any revised version will be posted on official FYLEX platforms.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>10. Contact</h2>
        <p>
          For questions regarding this Privacy Policy or your information, customers may contact FYLEX through the support details available on our website. Or reach us at <a href="mailto:support@fylexwatchhes.com" style={{ color: "inherit", textDecoration: "underline" }}>support@fylexwatchhes.com</a>
        </p>
      </section>
      </div>
    </div>
  );
}
