import { Injectable } from "@angular/core";

type Key = string | Symbol;

@Injectable({ providedIn: 'root' })
export class ScrollPositionStore {
  private positionMap = new Map<Key, number>();

  set(key: Key, position: number) {
    this.positionMap.set(key, position);
  }

  get(key: Key): number {
    return this.positionMap.get(key) ?? 0;
  }

  delete(key: Key): boolean {
    return this.positionMap.delete(key);
  }
}
