// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as THREE from "three";

import { ColorRGBA, PointCloud2, rosTimeToNanoSec } from "../ros";
import { makePose, Pose } from "../transforms";

export enum PointCloudColorMode {
  Flat,
  Gradient,
  Rainbow,
  Rgb,
  Rgba,
  Turbo,
}

export type PointCloudSettings = {
  pointSize?: number;
  pointShape?: string;
  decayTime?: number;
  colorMode?: PointCloudColorMode;
  rgbByteOrder?: "rgba" | "bgra" | "abgr";
  flatColor?: ColorRGBA;
  colorField?: string;
  minColor?: ColorRGBA;
  maxColor?: ColorRGBA;
  minValue?: number;
  maxValue?: number;
};

type PointCloudRenderable = THREE.Object3D & {
  userData: {
    pointCloud?: PointCloud2;
    settings?: PointCloudSettings;
    pose?: Pose;
    points?: THREE.Points;
  };
};

export const DEFAULT_FLAT_COLOR = { r: 1, g: 1, b: 1, a: 1 };
export const DEFAULT_MIN_COLOR = { r: 0, g: 0, b: 1, a: 1 };
export const DEFAULT_MAX_COLOR = { r: 1, g: 0, b: 0, a: 1 };
export const DEFAULT_RGB_BYTE_ORDER = "rgba";
export const DEFAULT_COLOR_FIELDS = ["intensity", "i"];

export class PointClouds extends THREE.Object3D {
  renderablesByTopic = new Map<string, PointCloudRenderable>();

  addPointCloud2Message(topic: string, pointCloud: PointCloud2): void {
    let renderable = this.renderablesByTopic.get(topic);
    if (!renderable) {
      renderable = new THREE.Object3D() as PointCloudRenderable;
      renderable.name = topic;
      // TODO
      // renderable.userData.points = new THREE.Points(geometry, material);

      this.add(renderable);
      this.renderablesByTopic.set(topic, renderable);
    }

    renderable.userData.pointCloud = pointCloud;
    renderable.userData.srcTime = rosTimeToNanoSec(pointCloud.header.stamp);
    renderable.userData.pose = makePose();
    this._updatePointCloudRenderable(renderable, topic, pointCloud);
  }

  _updatePointCloudRenderable(
    _renderable: PointCloudRenderable,
    _topic: string,
    _pointCloud: PointCloud2,
  ): void {
    // TODO
  }
}
