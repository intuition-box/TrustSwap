declare global {
  interface Window {
    umami?: {
      // Custom events
      track: (eventName?: string, data?: Record<string, any>) => void;
      // Official pageview API
      trackView: (url?: string, referrer?: string | null, websiteId?: string) => void;
    };
  }
}

// Avoid duplicate tracking when rapid route updates occur
let lastPathname: string | null = null;

// Poll until the Umami script is loaded
function whenUmamiReady(cb: () => void, tries = 20) {
  if (typeof window !== "undefined" && window.umami) return cb();
  if (tries <= 0) return;
  setTimeout(() => whenUmamiReady(cb, tries - 1), 250);
}

export function trackPageView(pathname: string) {
  if (!pathname || pathname === lastPathname) return;
  lastPathname = pathname;

  whenUmamiReady(() => {
    if (window.umami?.trackView) {
      // Proper pageview: shows up in the "Pageviews" metrics
      window.umami.trackView(pathname);
    } else if (window.umami?.track) {
      // Fallback as a custom event (visible under "Events", not "Pageviews")
      window.umami.track("pageview", { url: pathname });
    }
  });
}

export function trackEvent(name: string, data?: Record<string, any>) {
  whenUmamiReady(() => {
    window.umami?.track?.(name, data);
  });
}
