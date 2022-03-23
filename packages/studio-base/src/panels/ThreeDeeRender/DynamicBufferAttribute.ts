// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as THREE from "three";

interface TypedArray {
  readonly length: number;
  readonly [n: number]: number;
  BYTES_PER_ELEMENT: number;
  set(n: ArrayLike<number>, offset: number): void;
}

interface TypedArrayConstructor<T extends TypedArray> {
  new (length: number): T;
}

export class DynamicBufferAttribute<
  T extends TypedArray,
  C extends TypedArrayConstructor<T>,
> extends THREE.BufferAttribute {
  private _dataConstructor: C;
  // Total number of items that can be stored in this buffer attribute, which
  // can be larger than .count
  private _itemCapacity: number;

  // eslint-disable-next-line @foxglove/no-boolean-parameters
  constructor(arrayConstructor: C, itemSize: number, normalized?: boolean) {
    super(new arrayConstructor(0), itemSize, normalized);
    this._dataConstructor = arrayConstructor;
    this._itemCapacity = 0;

    this.setUsage(THREE.DynamicDrawUsage);
  }

  data(): T {
    return this.array as T;
  }

  resize(itemCount: number): void {
    this.count = itemCount;
    if (itemCount <= this._itemCapacity) {
      return;
    }
    this.array = new this._dataConstructor(itemCount * this.itemSize);
    this._itemCapacity = itemCount;
  }
}
