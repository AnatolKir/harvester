import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { allJobs } from '@/inngest/jobs';

// Create the Inngest HTTP handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allJobs,
  servePath: '/api/inngest',
});