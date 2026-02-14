export const isTauri = () => {
  return Boolean(window !== undefined && window.__TAURI_INTERNALS__);
};

export const getPlatform = () => {
  if (isTauri()) return 'native';
  return 'web';
};
