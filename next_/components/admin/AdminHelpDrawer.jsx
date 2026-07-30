 "use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";

// Page metadata mapping for every admin page
const helpMetadata = {
  "/admin/dashboard": {
    title: "Admin Dashboard",
    purpose: "Real-time executive cockpit monitoring store revenue, order velocity, stock alerts, and visitor traffic.",
    affectedPages: ["Home Page Featured Products", "Inventory Stock Signals", "Store Checkout SLAs"],
    tables: ["orders", "order_items", "customers", "products", "product_variants", "payments", "visitors"],
    apis: ["GET /api/dashboard", "GET /api/reports/dashboard"],
    bestPractices: [
      "Check Low Stock warnings daily to prevent stockouts on popular watch SKUs.",
      "Review Pending Orders immediately to fulfill delivery SLAs."
    ],
    commonMistakes: [
      "Ignoring out-of-stock indicators.",
      "Misinterpreting 100% daily growth metrics when previous day sales were zero."
    ]
  },
  "/admin/products": {
    title: "Products Catalogue",
    purpose: "Central catalog management for handcrafted watches, base pricing, SKUs, and inventory status.",
    affectedPages: ["/shop", "/products", "/discover", "/configure", "/pre-configure"],
    tables: ["products", "product_variants", "categories", "media", "product_belts", "product_boxes"],
    apis: ["GET /api/products", "POST /api/products", "PUT /api/products/:id", "DELETE /api/products/:id"],
    bestPractices: [
      "Assign high-resolution primary hero image for every watch.",
      "Ensure SKU numbers follow standard brand formatting (e.g., FY-CHR-001).",
      "Assign compatible belts and presentation boxes before publishing."
    ],
    commonMistakes: [
      "Publishing a watch without active variants or primary hero image.",
      "Leaving product code blank when generating variant SKUs."
    ]
  },
  "/admin/orders": {
    title: "Orders Management",
    purpose: "Monitor and manage customer transactions, order processing states, Shiprocket shipment dispatch, and PDF invoice downloads.",
    affectedPages: ["/my-purchases", "/thank-you"],
    tables: ["orders", "order_items", "order_addresses", "order_status_history", "shipments"],
    apis: ["GET /api/orders", "GET /api/orders/:id", "PUT /api/orders/:id/status", "GET /api/orders/:id/invoice"],
    bestPractices: [
      "Update status to Confirmed/Processing promptly upon payment validation.",
      "Attach valid tracking number and carrier info when marking order as Shipped."
    ],
    commonMistakes: [
      "Cancelling shipped orders without restoring inventory stock.",
      "Manually editing payment status without matching Razorpay transaction verification."
    ]
  },
  "/admin/media": {
    title: "Media Library & Speed Booster",
    purpose: "Central asset library for uploading, organizing, and optimizing high-res images and videos across FYLEX.",
    affectedPages: ["All Storefront Pages & Component Galleries"],
    tables: ["media", "media_variants", "media_optimization_logs"],
    apis: ["GET /api/media", "POST /api/media/upload", "DELETE /api/media/:id", "POST /api/media/optimization/*"],
    bestPractices: [
      "Always pick existing images from Media Library before uploading new duplicates.",
      "Run Speed Booster WebP/AVIF optimization on large PNG assets to reduce bandwidth."
    ],
    commonMistakes: [
      "Uploading 10MB+ raw PNG files without optimization.",
      "Deleting media assets currently attached to active product hero images."
    ]
  },
  "/admin/settings": {
    title: "System Settings",
    purpose: "Global configuration store for brand tokens, contact info, SMTP email, and store toggles.",
    affectedPages: ["Storefront Header, Footer, Legal & Settings Pages"],
    tables: ["settings"],
    apis: ["GET /api/system/settings", "POST /api/system/settings"],
    bestPractices: [
      "Verify email address before testing password reset workflows.",
      "Review design system colors in Live Preview before saving changes."
    ],
    commonMistakes: [
      "Saving invalid SMTP credentials causing failed password reset emails.",
      "Changing currency values without updating existing product variant prices."
    ]
  }
};

const AdminHelpDrawer = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Match current route or fallback to default
  const pageData = helpMetadata[pathname] || {
    title: "Admin Panel Guide",
    purpose: "Manage FYLEX Premium Watches enterprise content, orders, and system configurations.",
    affectedPages: ["FYLEX Storefront & Admin Operations"],
    tables: ["products", "orders", "customers", "media", "settings"],
    apis: ["GET /api/system/settings"],
    bestPractices: ["Ensure all required form fields are completed before saving changes."],
    commonMistakes: ["Navigating away from form pages before saving updates."]
  };

  return (
    <>
      {/* Floating Info Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 50,
          height: 50,
          borderRadius: "50%",
          background: "#161413",
          color: "#C79A67",
          border: "1.5px solid #82694A",
          boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-3px) scale(1.05)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(199, 154, 103, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.35)";
        }}
        title="Page Help & Operating Guide"
      >
        <i className="fas fa-info-circle"></i>
      </button>

      {/* Slide-out Help Drawer */}
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <div 
            onClick={() => setIsOpen(false)} 
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }} 
          />

          {/* Drawer Body */}
          <div style={{
            position: "relative",
            width: 460,
            maxWidth: "92vw",
            height: "100vh",
            background: "#161413",
            color: "#FFF6ED",
            borderLeft: "1px solid #82694A",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            padding: "28px 24px",
            boxShadow: "-12px 0 35px rgba(0,0,0,0.6)",
            fontFamily: "var(--font-inter, sans-serif)"
          }}>
            {/* Drawer Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: 18 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "#C79A67" }}>
                  FYLEX KNOWLEDGE CENTER
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: 20, color: "#FFFFFF", fontWeight: 800 }}>
                  ℹ️ {pageData.title}
                </h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#999B98", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <i className="fas fa-times" style={{ fontSize: 14 }}></i>
              </button>
            </div>

            {/* Content Sections */}
            <div style={{ marginTop: 24, fontSize: 13, lineHeight: 1.65, flex: 1 }}>
              <section style={{ marginBottom: 22, background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <h4 style={{ color: "#C79A67", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
                  📖 Purpose &amp; Business Objective
                </h4>
                <p style={{ color: "#999B98", margin: 0, fontSize: 13 }}>{pageData.purpose}</p>
              </section>

              <section style={{ marginBottom: 22 }}>
                <h4 style={{ color: "#C79A67", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                  🌍 Storefront Pages Affected
                </h4>
                <ul style={{ paddingLeft: 18, margin: 0, color: "#FFF6ED" }}>
                  {pageData.affectedPages?.map((p, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{p}</li>
                  ))}
                </ul>
              </section>

              <section style={{ marginBottom: 22 }}>
                <h4 style={{ color: "#C79A67", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                  🗄️ Database &amp; APIs
                </h4>
                <div style={{ fontSize: 12, color: "#999B98" }}>
                  <div style={{ marginBottom: 6 }}><strong>Tables:</strong> <code style={{ color: "#C79A67", background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4 }}>{pageData.tables?.join(", ")}</code></div>
                  <div><strong>APIs:</strong> <code style={{ color: "#38bdf8", background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4 }}>{pageData.apis?.join(", ")}</code></div>
                </div>
              </section>

              <section style={{ marginBottom: 22 }}>
                <h4 style={{ color: "#10b981", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                  💡 Best Practices
                </h4>
                <ul style={{ paddingLeft: 18, margin: 0, color: "#999B98" }}>
                  {pageData.bestPractices?.map((bp, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>{bp}</li>
                  ))}
                </ul>
              </section>

              <section style={{ marginBottom: 22 }}>
                <h4 style={{ color: "#ef4444", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                  ⚠️ Common Mistakes &amp; Warnings
                </h4>
                <ul style={{ paddingLeft: 18, margin: 0, color: "#fca5a5" }}>
                  {pageData.commonMistakes?.map((cm, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>{cm}</li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16, fontSize: 11, color: "#64748b", textAlign: "center" }}>
              FYLEX Enterprise CMS · Integrated Self-Documenting System
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminHelpDrawer;

