type VezinConfig = { apiUrl?: string; frontendUrl?: string };
type VezinWindow = Window & { __VEZIN_CONFIG__?: VezinConfig };
const nativeConfig = (window as VezinWindow).__VEZIN_CONFIG__;

export const apiUrl = nativeConfig?.apiUrl || import.meta.env.VITE_API_URL || 'https://vezinapi.rfqcollector.com';
export const frontendUrl = nativeConfig?.frontendUrl || import.meta.env.VITE_FRONTEND_URL || 'https://vezin.rfqcollector.com';
export const apkPath = '/downloads/vezin.apk';

(window as VezinWindow).__VEZIN_CONFIG__ = { apiUrl, frontendUrl };
