import cloudbase from '@cloudbase/js-sdk';

const app = cloudbase.init({
  env: 'dicom-001-9gyjnyfk6ab67241',
});

export const db = app.database();
export const _ = db.command;
export default app;
