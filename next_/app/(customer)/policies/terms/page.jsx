import React from "react";

export const metadata = {
  title: "Terms & Conditions | FYLEX",
  description: "Terms and conditions for using FYLEX platforms.",
};

export default function TermsAndConditions() {
  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', width: '100%' }}>
      <div className="policy-container" style={{ maxWidth: "800px", margin: "0 auto", padding: "140px 20px 80px", lineHeight: "1.8", color: "#ccc", fontFamily: "Avenir, 'Neue Haas Grotesk Display Pro', Inter, sans-serif", fontWeight: "300" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "30px", textTransform: "uppercase", letterSpacing: "4px", color: "#fff", textAlign: "center", fontWeight: "300" }}>Terms & Conditions</h1>
        <p style={{ marginBottom: "30px", fontSize: "1.1rem" }}>
        Welcome to FYLEX. At FYLEX, we believe a watch is a personal choice — one that reflects individual style, moments, and different phases of life. These Terms & Conditions govern all purchases and interactions made through official FYLEX platforms. By accessing our website or placing an order, you agree to the terms outlined below.
      </p>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>1. Product Information</h2>
        <p>FYLEX makes reasonable efforts to ensure product descriptions, specifications, pricing, and images are presented accurately. However:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Slight variations in color, texture, finishing, or appearance may occur due to screen settings, lighting conditions, material characteristics, or assembly processes.</li>
          <li>Product images are for reference purposes only.</li>
          <li>Minor differences between displayed and delivered products shall not be considered defects.</li>
        </ul>
        <p>FYLEX reserves the right to modify product specifications, pricing, packaging, or availability without prior notice.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>2. Orders & Acceptance</h2>
        <p>All orders are subject to product availability, payment authorization, and acceptance by FYLEX. FYLEX reserves the right to refuse, cancel, or limit any order in cases including but not limited to:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Pricing or inventory errors</li>
          <li>Suspected fraudulent activity</li>
          <li>Duplicate transactions</li>
          <li>Misuse of promotional offers</li>
          <li>Or violation of these Terms</li>
        </ul>
        <p>If an order is cancelled after payment has been processed, the applicable amount will be refunded to the original payment method within a reasonable timeframe.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>3. Pricing & Payments</h2>
        <p>
          All prices displayed on FYLEX platforms are listed in Indian Rupees (INR) unless stated otherwise. Payments must be completed through approved payment methods available at checkout. FYLEX does not store complete banking or card credentials on its servers. Transactions are processed through authorized third-party payment partners. Applicable taxes, shipping charges, or convenience fees may be added during checkout where relevant.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>4. Personalized Orders</h2>
        <p>Certain FYLEX products may involve individually prepared combinations, limited-run configurations, or customer-selected variations. As these products may be prepared specifically for individual orders:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Cancellations or modifications may not be possible once processing begins.</li>
          <li>Slight variations between products may naturally occur.</li>
          <li>Such products may not qualify for return eligibility except in cases of verified defects or transit-related damage.</li>
        </ul>
        <p>Customers are advised to review all selections carefully before confirming an order.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>5. Shipping & Delivery</h2>
        <p>FYLEX delivers to serviceable pin codes within India through third-party logistics partners. Estimated dispatch timelines are generally between 2–6 working days unless otherwise mentioned. Delivery timelines may vary due to:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Courier operations</li>
          <li>Weather conditions</li>
          <li>Regional restrictions</li>
          <li>Public holidays</li>
          <li>Or circumstances beyond FYLEX’s control</li>
        </ul>
        <p>While FYLEX will make reasonable efforts to assist customers with shipment-related concerns, delivery delays caused by third-party logistics providers are not considered grounds for cancellation or compensation. Risk of loss and ownership of products transfers to the customer upon successful delivery.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>6. Returns, Exchanges & Refunds</h2>
        <p>
          Returns, exchanges, and refunds are governed by the official FYLEX Refund & Exchange Policy available on our platforms. FYLEX reserves the right to approve or reject claims after inspection and verification.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>7. Warranty Coverage</h2>
        <p>FYLEX provides a limited warranty covering manufacturing defects in the internal watch movement for a period of 12 months from the dispatch date mentioned on the Warranty Card. The warranty applies only under normal usage conditions. The warranty does not cover:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Accidental damage</li>
          <li>Scratches or cosmetic wear</li>
          <li>Glass damage</li>
          <li>Strap or bracelet wear</li>
          <li>Battery depletion caused by normal usage</li>
          <li>Water or moisture damage</li>
          <li>Unauthorized repairs or modifications</li>
          <li>Misuse, negligence, or improper handling</li>
        </ul>
        <p>Any unauthorized servicing or modification immediately voids the warranty. Warranty decisions, repairs, replacements, or service outcomes remain subject to inspection and approval by FYLEX.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>8. Water Resistance</h2>
        <p>Unless specifically stated otherwise on the product page, FYLEX watches are designed primarily for everyday use and limited splash resistance only. (3 ATM WTR) Customers are advised to avoid:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Swimming</li>
          <li>Showers</li>
          <li>Diving</li>
          <li>Prolonged water exposure</li>
          <li>Or high-moisture environments</li>
        </ul>
        <p>Water damage is not covered under warranty.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>9. Intellectual Property</h2>
        <p>All content associated with FYLEX, including but not limited to:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Logos</li>
          <li>Product designs</li>
          <li>Dial layouts</li>
          <li>Packaging</li>
          <li>Website content</li>
          <li>Graphics</li>
          <li>Photographs</li>
          <li>And branding materials</li>
        </ul>
        <p>remain the intellectual property of FYLEX and may not be copied, reproduced, distributed, or commercially used without prior written permission.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>10. Limitation of Liability</h2>
        <p>To the maximum extent permitted under applicable law, FYLEX shall not be liable for:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Indirect or consequential damages</li>
          <li>Delays caused by third parties</li>
          <li>Loss arising from misuse or improper handling</li>
          <li>Unauthorized repairs</li>
          <li>Or circumstances beyond reasonable operational control</li>
        </ul>
        <p>In all cases, FYLEX’s total liability shall not exceed the amount paid for the purchased product. Nothing in these Terms limits rights available under applicable Indian consumer protection laws.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>11. User Conduct</h2>
        <p>Users agree not to:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Misuse FYLEX platforms</li>
          <li>Interfere with website functionality</li>
          <li>Engage in fraudulent activity</li>
          <li>Attempt unauthorized access</li>
          <li>Or use FYLEX content for unlawful purposes</li>
        </ul>
        <p>FYLEX reserves the right to restrict or terminate access in case of violations.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>12. Governing Law & Jurisdiction</h2>
        <p>These Terms & Conditions shall be governed by the laws of India. Any disputes arising in connection with FYLEX products, services, or transactions shall be subject to the jurisdiction of the appropriate courts in India.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>13. Updates to Terms</h2>
        <p>FYLEX reserves the right to modify these Terms & Conditions at any time without prior notice. Updated versions shall become effective upon publication on official FYLEX platforms.</p>
      </section>
      </div>
    </div>
  );
}
