export async function trackEvent(eventName, url, props = {}) {
  const origin = import.meta.env.VITE_UMAMI_API_ORIGIN;
  const websiteId = import.meta.env.VITE_UMAMI_API_CLIENT_USER_ID;
  const apiKey = import.meta.env.VITE_UMAMI_CLIENT_SECRET;

  const response = await fetch("https://api.ipify.org?format=json")
  const apifyResponse = await response.json()

  if (!origin || !websiteId) {
    console.error("Umami origin or website ID missing");
    return;
  }

  const body = {
    type: "event",
    payload: {
      name: eventName,
      website: websiteId,
      url,
      ip: apifyResponse.ip,
      props,
    },
  };

  try {
    const res = await fetch(`${origin}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[Umami] Error", res.status, await res.text());
    } else {
      console.log("[Umami] Success", res.status);
    }
  } catch (e) {
    console.error("[Umami] Fetch failed:", e);
  }
}