import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export interface VersionInfo {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
  mandatory?: boolean;
}

// Current compiled app version
const CURRENT_VERSION_CODE = 2; // Build 2 (v1.0.1)
const CURRENT_VERSION_NAME = "1.0.1";

export const useAppUpdate = () => {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check platform reliably: 'android' | 'ios' | 'web'
  const platform = Capacitor.getPlatform();
  const isNativeApp = (platform === "android" || platform === "ios" || Capacitor.isNativePlatform()) && platform !== "web";

  const checkVersion = async () => {
    // Web app NEVER checks or shows APK update banner
    if (!isNativeApp) {
      setIsUpdateAvailable(false);
      return;
    }

    try {
      const res = await fetch("/downloads/version.json", { cache: "no-store" });
      if (res.ok) {
        const data: VersionInfo = await res.json();
        // Show update banner ONLY if remote versionCode is strictly greater than installed app version
        if (data && data.versionCode > CURRENT_VERSION_CODE) {
          setUpdateInfo(data);
          setIsUpdateAvailable(true);
        } else {
          setIsUpdateAvailable(false);
        }
      }
    } catch (err) {
      console.warn("Could not check for app updates", err);
    }
  };

  useEffect(() => {
    checkVersion();
  }, []);

  const dismissUpdate = () => {
    setIsDismissed(true);
  };

  return {
    currentVersionName: CURRENT_VERSION_NAME,
    currentVersionCode: CURRENT_VERSION_CODE,
    updateInfo,
    isNative: isNativeApp,
    isUpdateAvailable: isNativeApp && isUpdateAvailable && !isDismissed,
    dismissUpdate,
    checkVersion
  };
};
