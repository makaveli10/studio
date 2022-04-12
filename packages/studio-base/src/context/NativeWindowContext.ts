// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

export interface INativeWindow {
  /** https://www.electronjs.org/docs/tutorial/represented-file */
  setRepresentedFilename(filename: string | undefined): Promise<void>;
}

const NativeWindowContext = createContext<INativeWindow | undefined>(undefined);
NativeWindowContext.displayName = "NativeWindowContext";

export function useNativeWindow(): INativeWindow | undefined {
  return useContext(NativeWindowContext);
}

export default NativeWindowContext;
