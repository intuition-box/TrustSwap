declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, any>) => void;
    };
  }
}

export function trackPageView(pathname: string) {
  if (window.umami) {
    window.umami.track("page_view", { url: pathname });
  }
}
