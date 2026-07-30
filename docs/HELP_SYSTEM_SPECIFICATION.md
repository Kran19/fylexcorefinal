# IN-APP HELP & KNOWLEDGE SYSTEM SPECIFICATION — FYLEX ENTERPRISE CMS

> **Document Type:** Feature Architecture & UI/UX Specification
> **Project:** FYLEX Premium Watches
> **Repository Source:** Fylex-final Codebase Inspection (100% Empirical)

---

## 1. Overview & Objective

To eliminate developer dependency and transform FYLEX into a self-documenting Enterprise CMS, an in-app **Help & Knowledge System** will be integrated across the Admin Panel.

Every Admin page will feature a unobtrusive, floating Information button (**ℹ️ Help**). Clicking the button slides out a sleek, luxury-styled **Interactive Knowledge Drawer** containing comprehensive technical, operational, and business documentation specific to that page.

---

## 2. UI/UX Specification

### Floating Trigger Button
- **Placement:** Fixed at **Bottom-Right** (ottom: 24px, ight: 24px, z-index: 999).
- **Styling:** Circular luxury glassmorphism button (width: 48px, height: 48px, order-radius: 50%, ackground: #161413, color: #C79A67 champagne gold, ox-shadow: 0 10px 25px rgba(0,0,0,0.25)).
- **Hover State:** Slight elevation (	ransform: translateY(-3px)), champagne glow ring (ox-shadow: 0 0 15px rgba(199, 154, 103, 0.4)).
- **Tooltip:** On hover, displays "Page Guide & Operations Help".

### Help Knowledge Drawer
- **Type:** Right-side Slide-Out Drawer (width: 460px, height: 100vh, position: fixed, ight: 0, 	op: 0).
- **Header:** Page Title + Champagne Gold Subtitle + Close Button (className="fas fa-times").
- **Theme:** Dark luxury theme (#161413 background, #999B98 walrus gray borders, #FFF6ED fatback text).
- **Tabs / Navigation Inside Drawer:**
  1. 📖 **Overview & Purpose**
  2. 🌍 **Frontend & DB Impact**
  3. 💡 **Best Practices & Warnings**
  4. 🔌 **API & Dev Notes**

---

## 3. Structural Drawer Template

`markdown
ℹ️ [Page Title]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Purpose & Business Objective
[Concise explanation of what this page controls and its strategic business value]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 Affected Frontend Components
[List of customer storefront routes and components updated by changes made on this page]
✓ Feature A
✓ Page B
✓ Component C

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗄 Database & Infrastructure
• Tables Consumed: [table1, table2, table3]
• APIs Used: [GET /api/example, POST /api/example]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Operational Best Practices
• [Actionable advice 1]
• [Actionable advice 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Common Mistakes & Warnings
• [Pitfall 1]
• [Pitfall 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 Related Admin Modules
• [Module 1](/admin/route1)
• [Module 2](/admin/route2)
`

---

## 4. Reusable React Component Specification (AdminHelpDrawer.jsx)

`jsx
"use client";
import React, { useState } from 'react';

const AdminHelpDrawer = ({ pageData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  if (!pageData) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#161413',
          color: '#C79A67',
          border: '1px solid #82694A',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          transition: 'all 0.3s ease',
        }}
        title="Page Help & Guide"
      >
        <i className="fas fa-info-circle"></i>
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setIsOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          
          <div style={{
            position: 'relative',
            width: 460,
            maxWidth: '90vw',
            height: '100vh',
            background: '#161413',
            color: '#FFF6ED',
            borderLeft: '1px solid #82694A',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#FFFFFF', fontWeight: 800 }}>ℹ️ {pageData.title} Guide</h3>
                <span style={{ fontSize: 11, color: '#C79A67', letterSpacing: '0.05em' }}>FYLEX ENTERPRISE KNOWLEDGE BASE</span>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#999B98', fontSize: 18, cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Content Body */}
            <div style={{ marginTop: 20, fontSize: 13, lineHeight: 1.6, flex: 1 }}>
              <section style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#C79A67', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>📖 Purpose</h4>
                <p style={{ color: '#999B98', margin: 0 }}>{pageData.purpose}</p>
              </section>

              <section style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#C79A67', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>🌍 Affects Storefront Pages</h4>
                <ul style={{ paddingLeft: 16, margin: 0, color: '#FFF6ED' }}>
                  {pageData.affectedPages?.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </section>

              <section style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#C79A67', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>💡 Best Practices</h4>
                <ul style={{ paddingLeft: 16, margin: 0, color: '#999B98' }}>
                  {pageData.bestPractices?.map((bp, i) => <li key={i}>{bp}</li>)}
                </ul>
              </section>

              <section style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#ef4444', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>⚠️ Common Pitfalls</h4>
                <ul style={{ paddingLeft: 16, margin: 0, color: '#fca5a5' }}>
                  {pageData.commonMistakes?.map((cm, i) => <li key={i}>{cm}</li>)}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminHelpDrawer;
`

---

*Generated as Document 05 of 07 in Production Gap Analysis Series*
