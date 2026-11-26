import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import GlobalLayout from "@/components/GlobalLayout";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FYLEX Premium Watches",
  description: "Built On Experience, Designed Around Choice.",
  icons: {
    icon: "/fylex_logo_name.png",
    shortcut: "/fylex_logo_name.png",
    apple: "/fylex_logo_name.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" type="image/png" href="/fylex_logo_name.png" />
        <link rel="shortcut icon" href="/fylex_logo_name.png" />
        <link rel="apple-touch-icon" href="/fylex_logo_name.png" />
        <link rel="preconnect" href="https://fonts.cdnfonts.com" crossOrigin="anonymous" />
        {/* Non-blocking display font stylesheets (Monument Extended & Futura PT) */}
        <Script
          id="fylex-display-fonts"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var urls = [
                  'https://fonts.cdnfonts.com/css/monument-extended',
                  'https://fonts.cdnfonts.com/css/futura-pt'
                ];
                urls.forEach(function(u){
                  var l = document.createElement('link');
                  l.rel = 'stylesheet';
                  l.href = u;
                  document.head.appendChild(l);
                });
              })();
            `,
          }}
        />
        {/* Meta Pixel Queue Stub (0B external blocking) + Lazy fbevents.js */}
        <Script
          id="fb-pixel-queue"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f){if(f.fbq)return;var n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];}(window);
              fbq('init', '1035472045697724');
              fbq('track', 'PageView');
            `,
          }}
        />
        <Script
          id="fb-pixel-sdk"
          src="https://connect.facebook.net/en_US/fbevents.js"
          strategy="lazyOnload"
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1035472045697724&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
        {/* Microsoft Clarity */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "zjo1jyu9ww");
            `,
          }}
        />
        {/* End Microsoft Clarity */}
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>
          <GlobalLayout>
            {children}
          </GlobalLayout>
        </Providers>
      </body>
    </html>
  );
}
