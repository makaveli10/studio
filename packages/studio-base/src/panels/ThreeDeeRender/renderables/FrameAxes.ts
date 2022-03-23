// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as THREE from "three";

import Logger from "@foxglove/log";

import { Renderer } from "../Renderer";
import { Pose, rosTimeToNanoSec, TF } from "../ros";
import { makePose, Transform } from "../transforms";
import { updatePose } from "../updatePose";

const log = Logger.getLogger(__filename);

type FrameAxisRenderable = THREE.Object3D & {
  userData: {
    frameId?: string;
    type?: string;
    selectable?: boolean;
    pose?: Pose;
  };
};

export class FrameAxes extends THREE.Object3D {
  renderer: Renderer;
  renderables = new Map<string, FrameAxisRenderable>();

  constructor(renderer: Renderer) {
    super();
    this.renderer = renderer;
  }

  dispose(): void {
    for (const renderable of this.renderables.values()) {
      renderable.traverse((obj) => {
        if (obj instanceof THREE.AxesHelper) {
          obj.dispose();
        }
      });
    }
    this.children.length = 0;
    this.renderables.clear();
  }

  addTransformMessage(tf: TF): void {
    let frameAdded = false;
    if (!this.renderer.transformTree.hasFrame(tf.header.frame_id)) {
      this._addFrameAxis(tf.header.frame_id);
      frameAdded = true;
    }
    if (!this.renderer.transformTree.hasFrame(tf.child_frame_id)) {
      this._addFrameAxis(tf.child_frame_id);
      frameAdded = true;
    }

    const stamp = rosTimeToNanoSec(tf.header.stamp);
    const t = tf.transform.translation;
    const q = tf.transform.rotation;
    const transform = new Transform([t.x, t.y, t.z], [q.x, q.y, q.z, q.w]);
    this.renderer.transformTree.addTransform(
      tf.child_frame_id,
      tf.header.frame_id,
      stamp,
      transform,
    );

    if (frameAdded) {
      log.info(`Added transform "${tf.header.frame_id}_T_${tf.child_frame_id}"`);
      this.renderer.emit("transformTreeUpdated", this.renderer);
    }
  }

  startFrame(currentTime: bigint): void {
    const renderFrameId = this.renderer.renderFrameId;
    const fixedFrameId = this.renderer.fixedFrameId;
    if (!renderFrameId || !fixedFrameId) {
      return;
    }

    for (const [frameId, renderable] of this.renderables.entries()) {
      updatePose(
        renderable,
        this.renderer.transformTree,
        renderFrameId,
        fixedFrameId,
        frameId,
        currentTime,
        currentTime,
      );
    }
  }

  private _addFrameAxis(frameId: string): void {
    if (this.renderables.has(frameId)) {
      return;
    }

    const frame = new THREE.Object3D() as FrameAxisRenderable;
    frame.name = frameId;
    frame.userData.frameId = frameId;
    frame.userData.type = "CoordinateFrame";
    frame.userData.selectable = true;
    frame.userData.pose = makePose();

    const AXIS_DEFAULT_LENGTH = 1; // [m]
    const axes = new THREE.AxesHelper(AXIS_DEFAULT_LENGTH);
    frame.add(axes);

    // TODO: <div> floating label

    this.add(frame);
    this.renderables.set(frameId, frame);
  }
}
