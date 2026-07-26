import React from "react";

export const metadata = {
  title: "Refund & Exchange Policy | FYLEX",
  description: "Refund and exchange policy for FYLEX platforms.",
};

export default function RefundAndExchangePolicy() {
  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', width: '100%' }}>
      <div className="policy-container" style={{ maxWidth: "800px", margin: "0 auto", padding: "140px 20px 80px", lineHeight: "1.8", color: "#ccc", fontFamily: "Avenir, 'Neue Haas Grotesk Display Pro', Inter, sans-serif", fontWeight: "300" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "30px", textTransform: "uppercase", letterSpacing: "4px", color: "#fff", textAlign: "center", fontWeight: "300" }}>Refund & Exchange Policy</h1>
        <p style={{ marginBottom: "30px", fontSize: "1.1rem" }}>
        At FYLEX, every watch undergoes quality checks before dispatch and is securely packaged prior to shipment. Please review the following policy carefully before placing an order.
      </p>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>1. Returns & Cancellations</h2>
        <p>Orders placed through official FYLEX platforms cannot be cancelled once confirmed. FYLEX currently does not offer returns or refunds for:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Change of mind</li>
          <li>Personal preference</li>
          <li>Strap sizing concerns</li>
          <li>Design expectations</li>
          <li>Or minor visual variations that do not affect product functionality</li>
        </ul>
        <p>Customers are advised to review product specifications and order details carefully before completing their purchase.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>2. Exchange Eligibility</h2>
        <p>FYLEX offers a limited 4-day exchange window only in cases involving:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Transit-related physical damage</li>
          <li>Manufacturing defects identified upon delivery</li>
          <li>Or receipt of an incorrect product</li>
        </ul>
        <p>The exchange period begins from the date of delivery. Products shall not qualify for exchange if:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Used</li>
          <li>Resized</li>
          <li>Tampered with</li>
          <li>Physically damaged after delivery</li>
          <li>Or returned without original packaging and accessories</li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>3. Proof Requirement</h2>
        <p>To help verify transit-related claims fairly and accurately, customers may be required to provide:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>A clear and uninterrupted unboxing video</li>
          <li>Photographs of the product and packaging</li>
          <li>Invoice or proof of purchase</li>
          <li>And a description of the reported issue</li>
        </ul>
        <p>The unboxing video should clearly show:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>The sealed package prior to opening</li>
          <li>The complete unboxing process without edits or cuts</li>
          <li>And the issue visible upon first inspection</li>
        </ul>
        <p>FYLEX reserves the right to reject claims where sufficient proof is unavailable.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>4. Exchange Process</h2>
        <p>To request an exchange:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>Customers must contact FYLEX within 4 days of delivery</li>
          <li>Provide the required supporting materials</li>
          <li>And follow the return instructions shared by the support team</li>
        </ul>
        <p>All exchange requests remain subject to inspection and approval. If approved:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>The original product must be returned securely</li>
          <li>And a replacement of the same model shall be arranged subject to availability</li>
        </ul>
        <p>If the same model is unavailable, FYLEX may offer:</p>
        <ul style={{ paddingLeft: "20px", marginBottom: "15px" }}>
          <li>A replacement product of similar value</li>
          <li>Store credit</li>
          <li>Or another reasonable resolution at its discretion</li>
        </ul>
        <p>Refunds are not applicable except where required under applicable law.</p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>5. Shipping Charges</h2>
        <p>
          For approved cases involving verified transit damage or manufacturing defects, FYLEX will bear the applicable return shipping cost. Original shipping charges paid during purchase are non-refundable unless otherwise required by applicable law.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>6. Non-Transferability</h2>
        <p>
          Exchange eligibility applies only to purchases made through official FYLEX platforms and is valid only for the original purchaser.
        </p>
      </section>
      </div>
    </div>
  );
}
