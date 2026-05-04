const playwright = await import('../ohif-viewer-source/node_modules/playwright/index.js');
const { chromium } = playwright.default ?? playwright;

const executablePath =
  'C:/Users/pal31/.agent-browser/browsers/chrome-146.0.7680.80/chrome-win64/chrome.exe';

const baseUrl = (process.env.DICOM_VIEWER_BASE_URL || 'https://wzfeybot.xyz').trim();
const studyId = process.env.DICOM_VIEWER_STUDY_ID || '894671fc69f4a3c8000734c67ddeb423';
const planName = process.env.DICOM_VIEWER_PLAN_NAME || 'Plan 1';
const url = `${baseUrl}/#/viewer/${studyId}`;

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1700, height: 1100 } });

page.on('console', message => {
  const text = message.text();
  if (text.includes('Unable to preventDefault') || text.includes('OHIF_COMMAND_FAILED')) {
    console.log(`[console:${message.type()}] ${text}`);
  }
});

async function openViewer() {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const warningBodyText = await page.locator('body').innerText().catch(() => '');
  if (warningBodyText.includes('确定访问')) {
    const confirmButton = page.getByText('确定访问').first();
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
      await page.waitForLoadState('domcontentloaded', { timeout: 120000 });
    }
  }
  await page.waitForSelector('iframe[title="DICOM Viewer"]', { timeout: 120000 });
  const frameHandle = await page.$('iframe[title="DICOM Viewer"]');
  const frame = await frameHandle.contentFrame();
  await frame.waitForSelector('.cornerstone-viewport-element,.viewport-element', {
    timeout: 180000,
  });
  await page.waitForTimeout(1500);
  return frame;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const frame = await openViewer();
  await page.getByRole('button', { name: planName }).click();
  await page.waitForTimeout(2500);

  const state = await frame.evaluate(() => {
    const debug = window.__dicomProjectDebug;
    const vpService = debug?.cornerstoneViewportService;
    if (!vpService) {
      return { error: 'missing debug services' };
    }

    return vpService.getViewportIds().map(viewportId => {
      const info = vpService.getViewportInfo(viewportId);
      const viewport = vpService.getCornerstoneViewport(viewportId);
      const canvasRect = viewport?.canvas?.getBoundingClientRect?.();
      const elementRect = viewport?.element?.getBoundingClientRect?.();

      return {
        viewportId,
        toolGroupId: info?.getToolGroupId?.() || null,
        viewportType: info?.getViewportType?.() || viewport?.type || null,
        canvasRect,
        elementRect,
      };
    });
  });

  assert(!state.error, state.error || 'failed to inspect viewport state');

  const mprViewports = state.filter(viewport => viewport.toolGroupId === 'mpr');
  assert(mprViewports.length >= 3, 'expected at least 3 MPR viewports');

  for (const viewport of mprViewports) {
    assert(viewport.canvasRect, `missing canvas rect for viewport ${viewport.viewportId}`);
    assert(viewport.elementRect, `missing element rect for viewport ${viewport.viewportId}`);
    assert(
      viewport.canvasRect.width >= viewport.elementRect.width * 0.9,
      `viewport ${viewport.viewportId} canvas width collapsed: ${viewport.canvasRect.width} vs ${viewport.elementRect.width}`
    );
    assert(
      viewport.canvasRect.height >= viewport.elementRect.height * 0.9,
      `viewport ${viewport.viewportId} canvas height collapsed: ${viewport.canvasRect.height} vs ${viewport.elementRect.height}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        studyId,
        planName,
        mprViewportCount: mprViewports.length,
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
