// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMedia } from "react-use";

import App from "./App";
import { AppSetting } from "./AppSetting";
import CssBaseline from "./components/CssBaseline";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalCss from "./components/GlobalCss";
import MultiProvider from "./components/MultiProvider";
import StudioToastProvider from "./components/StudioToastProvider";
import AppConfigurationContext, { AppConfiguration } from "./context/AppConfigurationContext";
import ConsoleApiContext from "./context/ConsoleApiContext";
import CurrentUserContext, { CurrentUser } from "./context/CurrentUserContext";
import ExtensionLoaderContext, { ExtensionLoader } from "./context/ExtensionLoaderContext";
import LayoutStorageContext from "./context/LayoutStorageContext";
import NativeAppMenuContext, { INativeAppMenu } from "./context/NativeAppMenuContext";
import NativeWindowContext, { INativeWindow } from "./context/NativeWindowContext";
import { IDataSourceFactory } from "./context/PlayerSelectionContext";
import { useAppConfigurationValue } from "./hooks";
import ConsoleApiRemoteLayoutStorageProvider from "./providers/ConsoleApiRemoteLayoutStorageProvider";
import UserProfileLocalStorageProvider from "./providers/UserProfileLocalStorageProvider";
import ConsoleApi from "./services/ConsoleApi";
import { ILayoutStorage } from "./services/ILayoutStorage";
import ThemeProvider from "./theme/ThemeProvider";

function ColorSchemeThemeProvider({ children }: React.PropsWithChildren<unknown>): JSX.Element {
  const [colorScheme = "dark"] = useAppConfigurationValue<string>(AppSetting.COLOR_SCHEME);
  const systemSetting = useMedia("(prefers-color-scheme: dark)");
  const isDark = colorScheme === "dark" || (colorScheme === "system" && systemSetting);
  return <ThemeProvider isDark={isDark}>{children}</ThemeProvider>;
}

type AppProps = {
  appConfiguration: AppConfiguration;
  dataSources: IDataSourceFactory[];
  consoleApi: ConsoleApi;
  currentUser: CurrentUser;
  layoutStorage: ILayoutStorage;
  extensionLoader: ExtensionLoader;
  nativeAppMenu?: INativeAppMenu;
  nativeWindow?: INativeWindow;
};

export function ActualApp(props: AppProps): JSX.Element {
  const {
    appConfiguration,
    dataSources,
    currentUser,
    layoutStorage,
    consoleApi,
    extensionLoader,
    nativeAppMenu,
    nativeWindow,
  } = props;

  const providers = [
    /* eslint-disable react/jsx-key */
    <ConsoleApiContext.Provider value={consoleApi} />,
    <CurrentUserContext.Provider value={currentUser} />,
    <ConsoleApiRemoteLayoutStorageProvider />,
    <StudioToastProvider />,
    <LayoutStorageContext.Provider value={layoutStorage} />,
    <UserProfileLocalStorageProvider />,
    <ExtensionLoaderContext.Provider value={extensionLoader} />,
    /* eslint-enable react/jsx-key */
  ];

  if (nativeAppMenu) {
    providers.push(<NativeAppMenuContext.Provider value={nativeAppMenu} />);
  }

  if (nativeWindow) {
    providers.push(<NativeWindowContext.Provider value={nativeWindow} />);
  }

  return (
    <AppConfigurationContext.Provider value={appConfiguration}>
      <ColorSchemeThemeProvider>
        <GlobalCss />
        <CssBaseline>
          <ErrorBoundary>
            <MultiProvider providers={providers}>
              <App availableSources={dataSources} deepLinks={[window.location.href]} />;
            </MultiProvider>
          </ErrorBoundary>
        </CssBaseline>
      </ColorSchemeThemeProvider>
    </AppConfigurationContext.Provider>
  );
}
