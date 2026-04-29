import cloudbase from '@cloudbase/js-sdk';

// Import and register storage component
import '@cloudbase/storage';

const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'your-env-id';

const app = cloudbase.init({
  env: ENV_ID,
});

export { app };
export const db = app.database();
export const auth = app.auth();
