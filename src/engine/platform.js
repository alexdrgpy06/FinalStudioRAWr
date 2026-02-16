/**
 * Author: Alejandro Ramírez
 * 
 * FinalStudio Platform Detection
 * 
 * Minimal utility to detect the current execution environment.
 * Primarily distinguishes between the Native Tauri desktop app 
 * and the Browser-based web deployment to enable appropriate 
 * engine switching.
 */
export const isTauri = () => {
  return Boolean(window !== undefined && window.__TAURI_INTERNALS__);
};

export const getPlatform = () => {
  if (isTauri()) return 'native';
  return 'web';
};
