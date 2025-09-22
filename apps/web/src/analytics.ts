declare global {
  interface Window {
    umami?: {
      track: (eventName?: string, data?: Record<string, any>) => void;
      trackView: (url?: string, referrer?: string | null, websiteId?: string) => void;
    };
  }
}

// Prevent duplicate for same route
let lastPathname: string | null = null;

// Wait for Umami script
function whenUmamiReady(cb: () => void, tries = 20) {
  if (typeof window !== "undefined" && window.umami) return cb();
  if (tries <= 0) return;
  setTimeout(() => whenUmamiReady(cb, tries - 1), 250);
}

const WEBSITE_ID = "13760d0b-e30d-43c2-9026-1920a86720c8";

export function trackPageView(pathname: string) {
  if (!pathname || pathname === lastPathname) return;
  lastPathname = pathname;

  whenUmamiReady(() => {
    if (window.umami?.trackView) {
      window.umami.trackView(pathname, document.referrer || null, WEBSITE_ID);
    } else if (window.umami?.track) {
      window.umami.track("pageview", { url: pathname, website: WEBSITE_ID });
    }
  });
}
