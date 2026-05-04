import i18n from 'i18next';
import { id } from './id';
import { initToolGroups, toolbarButtons, cornerstone,
  ohif,
  dicomsr,
  dicomvideo,
  basicLayout,
  basicRoute,
  extensionDependencies as basicDependencies,
  mode as basicMode,
  modeInstance as basicModeInstance,
 } from '@ohif/mode-basic';
import { BaseVolumeViewport } from '@cornerstonejs/core';
import { annotation as csAnnotation } from '@cornerstonejs/tools';
import {
  getViewportStatePayload,
  postBridgeMessage,
} from '../../../extensions/cornerstone/src/utils/dicomProjectBridge';

export const tracked = {
  measurements: '@ohif/extension-measurement-tracking.panelModule.trackedMeasurements',
  thumbnailList: '@ohif/extension-measurement-tracking.panelModule.seriesList',
  viewport: '@ohif/extension-measurement-tracking.viewportModule.cornerstone-tracked',
};

const dicomProjectCornerstone = {
  activeViewportWindowLevel:
    '@ohif/extension-cornerstone.panelModule.activeViewportWindowLevel',
};

export const extensionDependencies = {
  // Can derive the versions at least process.env.from npm_package_version
  ...basicDependencies,
  '@ohif/extension-measurement-tracking': '^3.0.0',
};

export const longitudinalInstance = {
  ...basicLayout,
  id: ohif.layout,
  props: {
    ...basicLayout.props,
    leftPanels: [[tracked.thumbnailList, dicomProjectCornerstone.activeViewportWindowLevel]],
    rightPanels: [cornerstone.segmentation, tracked.measurements],
    viewports: [
      {
        namespace: tracked.viewport,
        // Re-use the display sets from basic
        displaySetsToDisplay: basicLayout.props.viewports[0].displaySetsToDisplay,
      },
      ...basicLayout.props.viewports,
      ],
    }
  };


export const longitudinalRoute =
    {
      ...basicRoute,
      path: 'longitudinal',
        /*init: ({ servicesManager, extensionManager }) => {
          //defaultViewerRouteInit
        },*/
      layoutInstance: longitudinalInstance,
    };

export const modeInstance = {
    ...basicModeInstance,
    // TODO: We're using this as a route segment
    // We should not be.
    id,
    routeName: 'viewer',
    displayName: i18n.t('Modes:Basic Viewer'),
    onModeEnter: ({ servicesManager, extensionManager, commandsManager, appConfig }: withAppTypes) => {
      basicModeInstance.onModeEnter?.({
        servicesManager,
        extensionManager,
        commandsManager,
        appConfig,
      });

      const {
        viewportGridService,
        cornerstoneViewportService,
        hangingProtocolService,
        toolGroupService,
        screwPlanningService,
      } =
        servicesManager.services;

      (window as typeof window & { __dicomProjectDebug?: unknown }).__dicomProjectDebug = {
        servicesManager,
        viewportGridService,
        cornerstoneViewportService,
        hangingProtocolService,
        toolGroupService,
        screwPlanningService,
      };

      const broadcastViewportState = (viewportId: string) => {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        if (!viewport) {
          return;
        }

        const viewportInfo = cornerstoneViewportService.getViewportInfo(viewportId);
        const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId) || [];
        const displaySetInstanceUID = displaySetUIDs[0];
        const displaySetOptions = viewportInfo?.getDisplaySetOptions?.() || [];
        const primaryOptions = displaySetOptions[0] || {};
        const viewportType =
          viewportInfo?.getViewportType?.() || viewport.type || viewportInfo?.viewportOptions?.viewportType;

        let preset = primaryOptions.displayPreset;
        let windowWidth;
        let windowCenter;

        const properties = viewport.getProperties?.();
        const voiRange = properties?.voiRange;
        if (voiRange) {
          windowWidth = voiRange.upper - voiRange.lower;
          windowCenter = voiRange.lower + windowWidth / 2;
        } else if (primaryOptions.voi) {
          windowWidth = primaryOptions.voi.windowWidth;
          windowCenter = primaryOptions.voi.windowCenter;
        }

        if (viewport instanceof BaseVolumeViewport && !preset) {
          preset = viewport.getProperties?.()?.preset;
        }

        postBridgeMessage(
          getViewportStatePayload(
            viewportId,
            viewport,
            displaySetInstanceUID,
            preset,
            windowWidth,
            windowCenter
          )
        );
      };

      const getPlanCenter = (
        entryPoint: { x: number; y: number; z: number },
        targetPoint: { x: number; y: number; z: number }
      ): [number, number, number] => {
        return [
          (entryPoint.x + targetPoint.x) / 2,
          (entryPoint.y + targetPoint.y) / 2,
          (entryPoint.z + targetPoint.z) / 2,
        ];
      };

      const navigateViewportToWorldPoint = (
        viewport: {
          jumpToWorld?: (point: [number, number, number]) => void;
          getCamera?: () => {
            focalPoint?: number[];
            position?: number[];
            viewPlaneNormal?: number[];
          };
          setCamera?: (camera: {
            focalPoint: [number, number, number];
            position: [number, number, number];
          }) => void;
          render?: () => void;
        },
        worldPoint: [number, number, number]
      ) => {
        if (typeof viewport.jumpToWorld === 'function') {
          viewport.jumpToWorld(worldPoint);
          return;
        }

        const camera = viewport.getCamera?.();
        const focalPoint = camera?.focalPoint;
        const position = camera?.position;
        const viewPlaneNormal = camera?.viewPlaneNormal;
        if (!focalPoint || !position || !viewPlaneNormal || !viewport.setCamera) {
          return;
        }

        const normalLength = Math.hypot(
          viewPlaneNormal[0] ?? 0,
          viewPlaneNormal[1] ?? 0,
          viewPlaneNormal[2] ?? 0
        );
        if (!Number.isFinite(normalLength) || normalLength === 0) {
          return;
        }

        const nx = (viewPlaneNormal[0] ?? 0) / normalLength;
        const ny = (viewPlaneNormal[1] ?? 0) / normalLength;
        const nz = (viewPlaneNormal[2] ?? 0) / normalLength;

        const dx = worldPoint[0] - focalPoint[0];
        const dy = worldPoint[1] - focalPoint[1];
        const dz = worldPoint[2] - focalPoint[2];
        const distanceAlongNormal = dx * nx + dy * ny + dz * nz;

        viewport.setCamera({
          focalPoint: [
            focalPoint[0] + nx * distanceAlongNormal,
            focalPoint[1] + ny * distanceAlongNormal,
            focalPoint[2] + nz * distanceAlongNormal,
          ],
          position: [
            position[0] + nx * distanceAlongNormal,
            position[1] + ny * distanceAlongNormal,
            position[2] + nz * distanceAlongNormal,
          ],
        });
        viewport.render?.();
      };

      const navigateMprViewportsToWorldPoint = (worldPoint: [number, number, number]) => {
        const viewportIds = cornerstoneViewportService.getViewportIds();
        for (const vpId of viewportIds) {
          const vpInfo = cornerstoneViewportService.getViewportInfo(vpId);
          const vp = cornerstoneViewportService.getCornerstoneViewport(vpId);
          if (!vpInfo || !vp || vpInfo.getToolGroupId?.() === 'volume3d') {
            continue;
          }

          try {
            navigateViewportToWorldPoint(vp as never, worldPoint);
          } catch {
            // Silently skip viewports that can't navigate
          }
        }
      };

      const handleExternalMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        const payload = event.data;
        if (!payload || typeof payload !== 'object' || typeof payload.type !== 'string') {
          return;
        }

        const activeViewportId = viewportGridService.getActiveViewportId();
        if (!activeViewportId) {
          return;
        }

        const activeDisplaySetUID =
          viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId)?.[0];
        const activeViewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);

        try {
          switch (payload.type) {
            case 'SET_VIEW_MODE':
              if (typeof payload.viewMode === 'string') {
                hangingProtocolService.setActiveProtocolIds(payload.viewMode);
                hangingProtocolService.run(
                  {
                    studies: hangingProtocolService.studies,
                    displaySets: hangingProtocolService.displaySets,
                    activeStudy: hangingProtocolService.activeStudy,
                  },
                  payload.viewMode
                );
              }
              break;
            case 'SET_3D_PRESET':
              if (typeof payload.preset === 'string' && activeViewport) {
                commandsManager.runCommand('setViewportPreset', {
                  viewportId: activeViewportId,
                  preset: payload.preset,
                });
                broadcastViewportState(activeViewportId);
              }
              break;
            case 'SET_3D_WW_WC':
              if (
                typeof payload.windowWidth === 'number' &&
                typeof payload.windowCenter === 'number'
              ) {
                commandsManager.runCommand('setViewportWindowLevel', {
                  viewportId: activeViewportId,
                  windowWidth: payload.windowWidth,
                  windowCenter: payload.windowCenter,
                  displaySetInstanceUID: activeDisplaySetUID,
                });
                broadcastViewportState(activeViewportId);
              }
              break;
            case 'OPEN_NATIVE_RENDERING_PANEL':
              broadcastViewportState(activeViewportId);
              break;
            case 'SET_SCREW_PLANS':
              if (typeof payload.studyId === 'string' && Array.isArray(payload.plans)) {
                screwPlanningService.setPlans(payload.studyId, payload.plans);
                postBridgeMessage({
                  type: 'SCREW_PLANS_CHANGED',
                  studyId: payload.studyId,
                  activePlanId: screwPlanningService.getActivePlan(payload.studyId)?._id ?? null,
                  plans: screwPlanningService.getPlans(payload.studyId),
                });
              }
              break;
            case 'ACTIVATE_SCREW_PLAN':
              if (typeof payload.studyId === 'string') {
                screwPlanningService.setActivePlanId(payload.studyId, payload.planId ?? null);

                screwPlanningService.syncAllStudies();
                broadcastViewportState(activeViewportId);

                postBridgeMessage({
                  type: 'SCREW_PLANS_CHANGED',
                  studyId: payload.studyId,
                  activePlanId: screwPlanningService.getActivePlan(payload.studyId)?._id ?? null,
                  plans: screwPlanningService.getPlans(payload.studyId),
                });
              }
              break;
            case 'START_SCREW_PLAN_DRAW':
              if (typeof payload.studyId === 'string') {
                if (payload.plan && typeof payload.plan === 'object') {
                  screwPlanningService.upsertPlan(payload.studyId, payload.plan);
                }

                if (typeof payload.planId === 'string') {
                  screwPlanningService.setActivePlanId(payload.studyId, payload.planId);
                }

                // editOnly: plan already has geometry → just activate editing, don't create new
                if (!payload.editOnly) {
                  const initializedPlan = screwPlanningService.ensureActivePlanInitialized(
                    payload.studyId,
                    activeViewportId
                  );

                  if (initializedPlan?._id) {
                    screwPlanningService.setActivePlanId(payload.studyId, initializedPlan._id);
                  }
                }
              }

              {
                const activeViewportInfo = cornerstoneViewportService.getViewportInfo(activeViewportId);
                const tgId = activeViewportInfo?.getToolGroupId?.() || 'default';
                if (payload.editOnly) {
                  // For existing plans, keep tool passive (allows dragging but not drawing new).
                  // ScrewPlan is already in the passive tool list by default, so just sync annotations.
                  screwPlanningService.syncAllStudies();
                } else {
                  commandsManager.runCommand('setToolActive', {
                    toolName: 'ScrewPlan',
                    toolGroupId: tgId,
                  });
                }
              }
              break;

            case 'NAVIGATE_TO_SCREW_PLAN':
              if (
                typeof payload.studyId === 'string' &&
                typeof payload.planId === 'string' &&
                payload.entryPoint &&
                payload.targetPoint
              ) {
                navigateMprViewportsToWorldPoint(
                  getPlanCenter(payload.entryPoint, payload.targetPoint)
                );

                // Sync plan annotations so they're visible at the new position
                screwPlanningService.setActivePlanId(payload.studyId, payload.planId);
                screwPlanningService.syncAllStudies();
                broadcastViewportState(activeViewportId);
              }
              break;
          }
        } catch (error: unknown) {
          postBridgeMessage({
            type: 'OHIF_COMMAND_FAILED',
            command: payload.type,
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      };

      const activeViewportSubscription = viewportGridService.subscribe(
        viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
        ({ viewportId }) => {
          const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
          postBridgeMessage({
            type: 'ACTIVE_VIEWPORT_CHANGED',
            viewportId,
            viewportType: viewport?.type,
          });
          broadcastViewportState(viewportId);
        }
      );

      const viewportDataSubscription = cornerstoneViewportService.subscribe(
        cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
        ({ viewportId }) => {
          screwPlanningService.syncAllStudies();
          broadcastViewportState(viewportId);
        }
      );

      const screwPlanSubscription = screwPlanningService.subscribe(
        screwPlanningService.EVENTS.STATE_CHANGED,
        ({ studyId, activePlanId, plans }) => {
          postBridgeMessage({
            type: 'SCREW_PLANS_CHANGED',
            studyId,
            activePlanId,
            plans,
          });
        }
      );

      window.addEventListener('message', handleExternalMessage);

      modeInstance._bridgeCleanup = () => {
        activeViewportSubscription?.unsubscribe?.();
        viewportDataSubscription?.unsubscribe?.();
        screwPlanSubscription?.unsubscribe?.();
        window.removeEventListener('message', handleExternalMessage);
        if ((window as typeof window & { __dicomProjectDebug?: unknown }).__dicomProjectDebug) {
          delete (window as typeof window & { __dicomProjectDebug?: unknown }).__dicomProjectDebug;
        }
      };
    },
    onModeExit: ({ servicesManager }: withAppTypes) => {
      modeInstance._bridgeCleanup?.();
      servicesManager.services.screwPlanningService?.clear?.();
      basicModeInstance.onModeExit?.({ servicesManager });
    },
    routes: [
      longitudinalRoute
    ],
    extensions: extensionDependencies,
  };

const mode = {
  ...basicMode,
  id,
  modeInstance,
  extensionDependencies,
};

export default mode;
export { initToolGroups, toolbarButtons };
