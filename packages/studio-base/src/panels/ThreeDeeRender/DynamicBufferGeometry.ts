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

export class DynamicBufferGeometry<
  T extends TypedArray,
  C extends TypedArrayConstructor<T>,
> extends THREE.BufferGeometry {
  override attributes: { [name: string]: THREE.BufferAttribute } = {};

  private _dataConstructor: C;
  private _itemCapacity = 0;

  constructor(arrayConstructor: C) {
    super();
    this._dataConstructor = arrayConstructor;
  }

  createAttribute(
    name: THREE.BuiltinShaderAttributeName | string,
    itemSize: number,
  ): THREE.BufferGeometry {
    const data = new this._dataConstructor(this._itemCapacity * itemSize);
    const attribute = new THREE.BufferAttribute(data, itemSize);
    attribute.setUsage(THREE.DynamicDrawUsage);
    return this.setAttribute(name, attribute);
  }

  resize(itemCount: number): void {
    this.setDrawRange(0, itemCount);

    if (itemCount <= this._itemCapacity) {
      for (const attribute of Object.values(this.attributes)) {
        attribute.count = itemCount;
      }
      return;
    }

    for (const attributeName of Object.keys(this.attributes)) {
      const attribute = this.attributes[attributeName]!;
      const data = new this._dataConstructor(itemCount * attribute.itemSize);
      const newAttrib = new THREE.BufferAttribute(data, attribute.itemSize, attribute.normalized);
      newAttrib.setUsage(THREE.DynamicDrawUsage);
      this.attributes[attributeName] = newAttrib;
    }

    this._itemCapacity = itemCount;
  }
}
