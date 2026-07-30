 "use client";
import React, { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * NavLoadingBar
 * Provides immediate visual feedback during route changes in the Admin Panel.
 * Listens to pathname & searchParams changes to clear loading indicator.
 */
const NavLoadingBar = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [targetName, setTargetName] = useState("");

  useEffect(() => {
    // Hide loading bar when route transition finishes
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept clicks on admin internal links to trigger instant loading indicator
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (href && href.startsWith("/admin") && href !== pathname) {
        setLoading(true);
        // Clean title from href
        const parts = href.replace("/admin/", "").split("/");
        const name = parts[0] ? parts[0].replace("-", " ") : "page";
        setTargetName(name.toUpperCase());
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      {/* Top Animated Progress Bar */}
      <div
        style={{
          height: "4px",
          width: "100%",
          background: "linear-gradient(90deg, #c4a35a, #6366f1, #10b981)",
          backgroundSize: "200% 100%",
          animation: "navProgress 1.2s infinite linear",
          boxShadow: "0 0 10px rgba(197, 163, 90, 0.6)",
        }}
      />

      {/* Floating Transition Badge */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 24,
          background: "#161413",
          color: "#FFF6ED",
          border: "1px solid #82694A",
          padding: "8px 16px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          letterSpacing: "0.04em",
          animation: "fadeIn 0.2s ease-in-out",
        }}
      >
        <i
          className="fas fa-circle-notch fa-spin"
          style={{ color: "#C79A67", fontSize: 14 }}
        />
        <span>Navigating to {targetName || "PAGE"}...</span>
      </div>

      <style jsx global>{`
        @keyframes navProgress {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 200% 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default NavLoadingBar;

