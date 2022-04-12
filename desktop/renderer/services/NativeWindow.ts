// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { INativeWindow } from "@foxglove/studio-base";

import { Desktop } from "../../common/types";

export class NativeWindow implements INativeWindow {
  private bridge?: Desktop;

  constructor(bridge: Desktop) {
    this.bridge = bridge;
  }

  async setRepresentedFilename(path: string | undefined): Promise<void> {
    await this.bridge?.setRepresentedFilename(path);
  }
}
