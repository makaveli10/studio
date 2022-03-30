// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useRef } from "react";
import { useToasts } from "react-toast-notifications";

import Log from "@foxglove/log";
import { AppSetting } from "@foxglove/studio-base/AppSetting";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import { useCurrentLayoutActions } from "@foxglove/studio-base/context/CurrentLayoutContext";
import { PanelsState } from "@foxglove/studio-base/context/CurrentLayoutContext/actions";
import { useLayoutManager } from "@foxglove/studio-base/context/LayoutManagerContext";
import { usePlayerSelection } from "@foxglove/studio-base/context/PlayerSelectionContext";
import useCallbackWithToast from "@foxglove/studio-base/hooks/useCallbackWithToast";
import useDeepMemo from "@foxglove/studio-base/hooks/useDeepMemo";
import { useSessionStorageValue } from "@foxglove/studio-base/hooks/useSessionStorageValue";
import { AppURLState, parseAppURLState } from "@foxglove/studio-base/util/appURLState";
import isDesktopApp from "@foxglove/studio-base/util/isDesktopApp";

const selectSeek = (ctx: MessagePipelineContext) => ctx.seekPlayback;
const selectUrlState = (ctx: MessagePipelineContext) => ctx.playerState.urlState;

const log = Log.getLogger(__filename);

/**
 * Restores our session state from any deep link we were passed on startup.
 */
export function useInitialDeepLinkState(deepLinks: string[]): void {
  const stableUrlState = useDeepMemo(useMessagePipeline(selectUrlState));
  const { selectSource } = usePlayerSelection();
  const { setSelectedLayoutId } = useCurrentLayoutActions();
  const layoutManager = useLayoutManager();
  const { addToast } = useToasts();
  const [launchPreference, setLaunchPreference] = useSessionStorageValue(
    AppSetting.LAUNCH_PREFERENCE,
  );
  const seekPlayback = useMessagePipeline(selectSeek);

  const appUrlRef = useRef<AppURLState | undefined>();
  if (!appUrlRef.current) {
    const firstLink = deepLinks[0];
    if (firstLink) {
      try {
        appUrlRef.current = parseAppURLState(new URL(firstLink));
      } catch (error) {
        log.error(error);
      }
    }
  }

  const shouldSeekTimeRef = useRef(false);

  // Set a sessionStorage preference for web if we have a stable URL state.
  // This allows us to avoid asking for the preference immediately on
  // launch of an empty session and makes refreshes do the right thing.
  useEffect(() => {
    if (isDesktopApp()) {
      return;
    }

    if (stableUrlState && !launchPreference) {
      setLaunchPreference("web");
    }
  }, [launchPreference, setLaunchPreference, stableUrlState]);

  const loadLayoutFromURL = useCallbackWithToast(async () => {
    const url = appUrlRef.current!.layoutURL!;
    const name = url.pathname.replace(/.*\//, '')
    log.debug(`Trying to load layout ${name} from ${url}`);
    let res;
    try {
      res = await fetch(url.href);
    } catch {
      addToast(`Could not load the layout from ${url}`, { appearance: "error" });
      return;
    }
    const parsedState: unknown = JSON.parse(await res.text());

    if (typeof parsedState !== "object" || !parsedState) {
      addToast(`${url} does not contain valid layout JSON`, { appearance: "error" });
      return;
    }

    const data = parsedState as PanelsState
    const newLayout = await layoutManager.saveNewLayout({
      name,
      data,
      permission: "CREATOR_WRITE",
    });
    setSelectedLayoutId(newLayout.id);
  }, [layoutManager, setSelectedLayoutId, addToast]);

  useEffect(() => {
    const urlState = appUrlRef.current;
    if (!urlState) {
      return;
    }

    // Apply any available datasource args
    if (urlState.ds && urlState.dsParams) {
      log.debug("Initialising source from url", urlState);
      selectSource(urlState.ds, { type: "connection", params: urlState.dsParams });
      urlState.ds = undefined;
      urlState.dsParams = undefined;
      shouldSeekTimeRef.current = true;
    }

    // Apply any available layout id
    if (urlState.layoutId != undefined) {
      log.debug(`Initializing layout from url: ${urlState.layoutId}`);
      setSelectedLayoutId(urlState.layoutId);
      urlState.layoutId = undefined;
    }

    if (urlState.layoutURL != undefined) {
      void loadLayoutFromURL();
    }
  }, [selectSource, setSelectedLayoutId, loadLayoutFromURL]);

  useEffect(() => {
    const urlState = appUrlRef.current;
    if (urlState?.time == undefined || !seekPlayback) {
      return;
    }

    if (!shouldSeekTimeRef.current) {
      log.debug("Clearing urlState time");
      urlState.time = undefined;
      return;
    }

    shouldSeekTimeRef.current = false;

    log.debug(`Seeking to url time:`, urlState.time);
    seekPlayback(urlState.time);
    urlState.time = undefined;
  }, [seekPlayback]);
}
