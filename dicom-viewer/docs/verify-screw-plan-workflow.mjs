const playwright = await import('../ohif-viewer-source/node_modules/playwright/index.js');
const { chromium } = playwright.default ?? playwright;

const executablePath =
  'C:/Users/pal31/.agent-browser/browsers/chrome-146.0.7680.80/chrome-win64/chrome.exe';

const baseUrl = (process.env.DICOM_VIEWER_BASE_URL || 'http://127.0.0.1:3021').trim();
const studyId = process.env.DICOM_VIEWER_STUDY_ID || '894671fc69f4a3c8000734c67ddeb423';
const planName =
  process.env.DICOM_VIEWER_PLAN_NAME || `Auto Plan ${new Date().toISOString().replace(/[:.]/g, '-')}`;
const url = `${baseUrl}/#/viewer/${studyId}`;

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

page.on('console', message => {
  console.log(`[console:${message.type()}] ${message.text()}`);
});
page.on('pageerror', error => {
  console.log(`[pageerror] ${error.message}`);
});
page.on('response', response => {
  if (response.status() >= 400) {
    console.log(`[response:${response.status()}] ${response.url()}`);
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
  try {
    await page.waitForSelector('iframe[title="DICOM Viewer"]', { timeout: 120000 });
  } catch (error) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    await page.screenshot({
      path: 'F:/test/dicom-viewer/docs/verify-screw-plan-workflow-failure.png',
      fullPage: true,
    });
    console.log(JSON.stringify({ phase: 'openViewerFailure', bodyText }, null, 2));
    throw error;
  }
  const frameHandle = await page.$('iframe[title="DICOM Viewer"]');
  const frame = await frameHandle.contentFrame();
  await frame.waitForSelector('.cornerstone-viewport-element,.viewport-element', {
    timeout: 180000,
  });
  await page.waitForTimeout(1500);
  return frame;
}

async function collectFrameState(frame) {
  return frame.evaluate(currentStudyId => {
    const debug = window.__dicomProjectDebug;
    const screwPlanningService = debug?.screwPlanningService;
    const cornerstoneViewportService = debug?.cornerstoneViewportService;
    const viewportGridService = debug?.viewportGridService;

    if (!screwPlanningService || !cornerstoneViewportService || !viewportGridService) {
      return { error: 'missing debug services' };
    }

    const plans = screwPlanningService.getPlans(currentStudyId);
    const activePlan = screwPlanningService.getActivePlan(currentStudyId);
    const viewportIds = cornerstoneViewportService.getViewportIds();

    const viewportStates = viewportIds.map(viewportId => {
      const info = cornerstoneViewportService.getViewportInfo(viewportId);
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      let annotations = [];
      if (viewport?.element) {
        try {
          annotations =
            window.cornerstoneTools?.annotation?.state
              ?.getAnnotations?.('ScrewPlan', viewport.element)
              ?.map?.(annotation => ({
                annotationUID: annotation.annotationUID,
                planId: annotation.metadata?.planId,
                points: annotation.data?.handles?.points,
              })) || [];
        } catch (_error) {
          annotations = [];
        }
      }

      const actors =
        typeof viewport?.getActors === 'function'
          ? viewport
              .getActors()
              .filter(actor => actor.uid?.startsWith?.('screw-plan-actor:'))
              .map(actor => actor.uid)
          : [];

      return {
        viewportId,
        viewportType: info?.getViewportType?.() || viewport?.type || null,
        toolGroupId: info?.getToolGroupId?.() || null,
        frameOfReferenceUID: viewport?.getFrameOfReferenceUID?.() || null,
        annotationCount: annotations.length,
        annotations,
        screwActorIds: actors,
      };
    });

    return {
      activeViewportId: viewportGridService.getActiveViewportId(),
      planCount: plans.length,
      plans,
      activePlan,
      viewportStates,
    };
  }, studyId);
}

async function mutatePlanInFrame(frame, planId) {
  return frame.evaluate(activePlanId => {
    const debug = window.__dicomProjectDebug;
    const viewportGridService = debug?.viewportGridService;
    const cornerstoneViewportService = debug?.cornerstoneViewportService;
    const activeViewportId = viewportGridService?.getActiveViewportId?.();
    const activeViewport = activeViewportId
      ? cornerstoneViewportService?.getCornerstoneViewport?.(activeViewportId)
      : null;
    const annotations =
      window.cornerstoneTools?.annotation?.state?.getAnnotations?.(
        'ScrewPlan',
        activeViewport?.element
      ) || [];
    const annotation = annotations.find(item => item.metadata?.planId === activePlanId);
    if (!annotation || !activeViewport?.element) {
      return { changed: false };
    }

    const [entryPoint, targetPoint] = annotation.data.handles.points;
    const nextPoints = [
      [entryPoint[0] + 5, entryPoint[1] + 2, entryPoint[2]],
      [targetPoint[0], targetPoint[1], targetPoint[2]],
    ];
    annotation.data.handles.points = nextPoints;

    window.cornerstoneTools.annotation.state.triggerAnnotationModified(
      annotation,
      activeViewport.element,
      window.cornerstoneTools.Enums.ChangeTypes.HandlesUpdated
    );

    return {
      changed: true,
      nextPoints,
      viewportId: activeViewportId,
    };
  }, planId);
}

async function deletePlan(planId) {
  const apiBase = new URL('/api', baseUrl).toString().replace(/\/$/, '');
  const response = await fetch(`${apiBase}/studies/${studyId}/screw-plans/${planId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete plan ${planId}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function countMprViewports(state) {
  return state.viewportStates.filter(viewport => viewport.toolGroupId === 'mpr');
}

function count3DViewports(state) {
  return state.viewportStates.filter(viewport => viewport.toolGroupId === 'volume3d');
}

try {
  let frame = await openViewer();

  await page.getByRole('button', { name: 'New screw plan' }).click();
  await page.getByRole('button', { name: 'Draw channel' }).click();
  await page.waitForTimeout(2000);

  let state = await collectFrameState(frame);
  console.log(JSON.stringify({ phase: 'after-draw', state }, null, 2));

  assert(!state.error, state.error || 'Unknown frame state error');
  assert(state.activePlan, 'Active plan was not created');
  assert(Boolean(state.activePlan.frameOfReferenceUID), 'Active plan has no FrameOfReferenceUID');
  assert(
    !(state.activePlan.entryPoint.x === 0 && state.activePlan.entryPoint.y === 0 && state.activePlan.entryPoint.z === 0),
    'Active plan entry point is still zero'
  );

  const mprViewports = countMprViewports(state);
  const threeDViewports = count3DViewports(state);
  assert(mprViewports.length >= 3, 'Expected at least 3 MPR viewports');
  assert(threeDViewports.length >= 1, 'Expected at least 1 3D viewport');

  for (const viewport of mprViewports) {
    const matchingAnnotations = viewport.annotations.filter(
      annotation => annotation.planId === state.activePlan._id
    );
    assert(
      matchingAnnotations.length >= 1,
      `Viewport ${viewport.viewportId} does not contain the active screw annotation`
    );
  }

  const volume3DViewport = threeDViewports[0];
  assert(
    volume3DViewport.screwActorIds.some(actorId => actorId.endsWith(state.activePlan._id)),
    '3D viewport does not contain the active screw actor'
  );

  await page.getByLabel('Diameter').fill('7.1');
  await page.getByLabel('Color').fill('#00cc88');
  await page.waitForTimeout(1200);

  state = await collectFrameState(frame);
  console.log(JSON.stringify({ phase: 'after-style-update', state }, null, 2));
  assert(state.activePlan?.diameterMm === 7.1, 'Diameter update did not propagate');
  assert(state.activePlan?.color?.toLowerCase() === '#00cc88', 'Color update did not propagate');

  const beforeMutation = state.activePlan;
  const mutation = await mutatePlanInFrame(frame, state.activePlan._id);
  assert(mutation.changed, 'Failed to mutate active plan annotation');
  await page.waitForTimeout(1200);

  state = await collectFrameState(frame);
  console.log(JSON.stringify({ phase: 'after-point-mutation', mutation, state }, null, 2));
  assert(
    Math.abs(state.activePlan.entryPoint.x - beforeMutation.entryPoint.x) > 1,
    'Entry point mutation did not propagate back to plan state'
  );

  for (const viewport of countMprViewports(state)) {
    const matchingAnnotations = viewport.annotations.filter(
      annotation => annotation.planId === state.activePlan._id
    );
    assert(
      matchingAnnotations.length >= 1,
      `Viewport ${viewport.viewportId} lost the screw annotation after mutation`
    );
  }

  const mutated3DViewport = count3DViewports(state)[0];
  assert(
    mutated3DViewport.screwActorIds.some(actorId => actorId.endsWith(state.activePlan._id)),
    '3D actor disappeared after point mutation'
  );

  page.once('dialog', async dialog => {
    await dialog.accept(planName);
  });
  await page.getByRole('button', { name: 'Save plan' }).click();
  await page.waitForTimeout(2500);

  state = await collectFrameState(frame);
  console.log(JSON.stringify({ phase: 'after-save', state }, null, 2));

  assert(!state.activePlan?._id?.startsWith?.('draft-'), 'Saved plan still has a draft id');
  assert(state.activePlan?.name === planName, 'Saved plan name mismatch');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  frame = await openViewer();
  state = await collectFrameState(frame);
  console.log(JSON.stringify({ phase: 'after-reload', state }, null, 2));

  const savedPlan = state.plans.find(plan => plan.name === planName);
  assert(savedPlan, 'Saved plan was not loaded after reload');
  assert(savedPlan.color.toLowerCase() === '#00cc88', 'Reloaded plan color mismatch');
  assert(savedPlan.diameterMm === 7.1, 'Reloaded plan diameter mismatch');

  console.log(
    JSON.stringify(
      {
        success: true,
        baseUrl,
        studyId,
        planName,
        savedPlanId: savedPlan._id,
      },
      null,
      2
    )
  );

  if (planName.startsWith('Auto Plan ')) {
    await deletePlan(savedPlan._id);
  }
} finally {
  await browser.close();
}
