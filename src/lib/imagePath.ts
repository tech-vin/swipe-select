import { convertFileSrc } from '@tauri-apps/api/core';

export function originalSrc(absolutePath: string): string {
  return convertFileSrc(absolutePath);
}
