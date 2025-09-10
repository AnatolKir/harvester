import { Inngest } from "inngest";

// Create the main Inngest client
export const inngest = new Inngest({
  id: "tiktok-domain-harvester",
  name: "TikTok Domain Harvester",
  // Explicitly set event key so all inngest.send(...) requests are authorized
  eventKey: process.env.INNGEST_EVENT_KEY,
});


