// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { CoordinateFrame } from "./CoordinateFrame";
import { Transform } from "./Transform";
import { Pose } from "./geometry";
import { Duration, Time } from "./time";

const DEFAULT_MAX_STORAGE_TIME: Duration = 10n * BigInt(1e9);

/**
 * TransformTree is a collection of coordinate frames with convenience methods
 * for getting and creating frames and adding transforms between frames.
 */
export class TransformTree {
  private _frames = new Map<string, CoordinateFrame>();
  private _maxStorageTime: Duration;

  constructor(maxStorageTime = DEFAULT_MAX_STORAGE_TIME) {
    this._maxStorageTime = maxStorageTime;
  }

  addTransform(frameId: string, parentFrameId: string, time: Time, transform: Transform): void {
    const frame = this.getOrCreateFrame(frameId);
    const curParentFrame = frame.parent();
    if (curParentFrame == undefined || curParentFrame.id !== parentFrameId) {
      // This frame was previously unparented but now we know its parent, or we
      // are reparenting this frame
      frame.setParent(this.getOrCreateFrame(parentFrameId));
    }

    frame.addTransform(time, transform);
  }

  hasFrame(id: string): boolean {
    return this._frames.has(id);
  }

  frame(id: string): CoordinateFrame | undefined {
    return this._frames.get(id);
  }

  getOrCreateFrame(id: string): CoordinateFrame {
    let frame = this._frames.get(id);
    if (!frame) {
      frame = new CoordinateFrame(id, undefined, this._maxStorageTime);
      this._frames.set(id, frame);
    }
    return frame;
  }

  frames(): ReadonlyMap<string, CoordinateFrame> {
    return this._frames;
  }

  apply(
    output: Pose,
    input: Readonly<Pose>,
    frameId: string,
    rootFrameId: string | undefined,
    srcFrameId: string,
    dstTime: Time,
    srcTime: Time,
    maxDelta?: Duration,
  ): Pose | undefined {
    const frame = this.frame(frameId);
    const srcFrame = this.frame(srcFrameId);
    if (!frame || !srcFrame) {
      return undefined;
    }
    const rootFrame =
      (rootFrameId != undefined ? this.frame(rootFrameId) : frame.root()) ?? frame.root();
    return frame.apply(output, input, rootFrame, srcFrame, dstTime, srcTime, maxDelta);
  }

  static Clone(tree: TransformTree): TransformTree {
    // eslint-disable-next-line no-underscore-dangle
    const newTree = new TransformTree(tree._maxStorageTime);
    // eslint-disable-next-line no-underscore-dangle
    newTree._frames = tree._frames;
    return newTree;
  }
}
