import { inngest } from '../client';
import { JobResult } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const materializedViewsRefreshJob = inngest.createFunction(
  {
    id: 'materialized-views-refresh',
    name: 'Materialized Views Refresh',
    retries: 1,
    concurrency: { limit: 1 },
  },
  [{ cron: '*/5 * * * *' }],
  async ({ step, logger }) => {
    const enabled = String(process.env.MATVIEWS_ENABLED || 'false').toLowerCase() === 'true';
    if (!enabled) {
      logger.info('MATVIEWS_ENABLED is false; skipping refresh');
      return { success: true } as JobResult;
    }

    try {
      const { error } = await step.run('refresh-matviews', async () => {
        const { error: rpcError } = await (supabase as any).rpc('refresh_matviews');
        return { error: rpcError };
      });
      if (error) throw new Error(error.message || 'refresh_matviews failed');
      logger.info('Materialized views refreshed successfully');
      return { success: true } as JobResult;
    } catch (err) {
      logger.error('Materialized views refresh failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      } as JobResult;
    }
  }
);
