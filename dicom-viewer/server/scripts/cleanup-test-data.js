require('dotenv/config');
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: process.env.CLOUDBASE_ENV_ID,
  secretId: process.env.TENCENTCLOUD_SECRETID,
  secretKey: process.env.TENCENTCLOUD_SECRETKEY,
});

const db = app.database();

const OLD_STUDY_IDS = [
  'f073206169ecc38a000450051cb65908',
  '4ddfc23469ecc6df0004740a3d46e97f',
];

async function cleanup() {
  for (const studyId of OLD_STUDY_IDS) {
    console.log(`Cleaning study: ${studyId}`);

    // Find series for this study
    const seriesRes = await db.collection('series').where({ studyId }).get();
    const seriesIds = seriesRes.data.map((s) => s._id);
    console.log(`  Found ${seriesIds.length} series`);

    // Delete instances for each series
    for (const seriesId of seriesIds) {
      const instRes = await db.collection('instances').where({ seriesId }).get();
      console.log(`  Series ${seriesId}: ${instRes.data.length} instances`);

      for (const inst of instRes.data) {
        await db.collection('instances').doc(inst._id).remove();
      }

      await db.collection('series').doc(seriesId).remove();
    }

    await db.collection('studies').doc(studyId).remove();
    console.log(`  Study ${studyId} deleted`);
  }

  console.log('Cleanup complete');
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
