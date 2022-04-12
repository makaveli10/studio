// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMemo } from "react";

import {
  IDataSourceFactory,
  AppSetting,
  Ros1LocalBagDataSourceFactory,
  Ros2LocalBagDataSourceFactory,
  RosbridgeDataSourceFactory,
  Ros1RemoteBagDataSourceFactory,
  FoxgloveDataPlatformDataSourceFactory,
  FoxgloveWebSocketDataSourceFactory,
  UlogLocalDataSourceFactory,
  McapLocalDataSourceFactory,
  SampleNuscenesDataSourceFactory,
  IAppConfiguration,
  McapRemoteDataSourceFactory,
  App,
  ConsoleApi,
} from "@foxglove/studio-base";

import Ros1UnavailableDataSourceFactory from "./dataSources/Ros1UnavailableDataSourceFactory";
import Ros2UnavailableDataSourceFactory from "./dataSources/Ros2UnavailableDataSourceFactory";
import VelodyneUnavailableDataSourceFactory from "./dataSources/VelodyneUnavailableDataSourceFactory";
import { LocalStorageLayoutStorage } from "./services/LocalStorageLayoutStorage";
import { NoopExtensionLoader } from "./services/NoopExtensionLoader";

export function Root({ appConfiguration }: { appConfiguration: IAppConfiguration }): JSX.Element {
  const enableExperimentalBagPlayer: boolean =
    (appConfiguration.get(AppSetting.EXPERIMENTAL_BAG_PLAYER) as boolean | undefined) ?? false;
  const enableExperimentalDataPlatformPlayer: boolean =
    (appConfiguration.get(AppSetting.EXPERIMENTAL_DATA_PLATFORM_PLAYER) as boolean | undefined) ??
    false;

  const dataSources: IDataSourceFactory[] = useMemo(() => {
    const sources = [
      new Ros1UnavailableDataSourceFactory(),
      new Ros1LocalBagDataSourceFactory({ useIterablePlayer: enableExperimentalBagPlayer }),
      new Ros1RemoteBagDataSourceFactory({ useIterablePlayer: enableExperimentalBagPlayer }),
      new Ros2UnavailableDataSourceFactory(),
      new Ros2LocalBagDataSourceFactory(),
      new RosbridgeDataSourceFactory(),
      new FoxgloveWebSocketDataSourceFactory(),
      new UlogLocalDataSourceFactory(),
      new VelodyneUnavailableDataSourceFactory(),
      new FoxgloveDataPlatformDataSourceFactory({
        useIterablePlayer: enableExperimentalDataPlatformPlayer,
      }),
      new SampleNuscenesDataSourceFactory({ useIterablePlayer: enableExperimentalBagPlayer }),
      new McapLocalDataSourceFactory(),
      new McapRemoteDataSourceFactory(),
    ];

    return sources;
  }, [enableExperimentalBagPlayer, enableExperimentalDataPlatformPlayer]);

  const layoutStorage = useMemo(() => new LocalStorageLayoutStorage(), []);
  const extensionLoader = useMemo(() => new NoopExtensionLoader(), []);
  const consoleApi = useMemo(() => new ConsoleApi(process.env.FOXGLOVE_API_URL!), []);

  return (
    <App
      enableLaunchPreferenceScreen
      deepLinks={[window.location.href]}
      dataSources={dataSources}
      appConfiguration={appConfiguration}
      layoutStorage={layoutStorage}
      consoleApi={consoleApi}
      extensionLoader={extensionLoader}
    />
  );
}
