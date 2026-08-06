import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export interface VersionInfo {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
  mandatory?: boolean;
}

// Current compiled native app version
const CURRENT_VERSION_CODE = 2; // Build 2 (v1.0.1)
const CURRENT_VERSION_NAME = "1.0.1";

export const isRunningInNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;

  // If running on remote web domain (e.g. azurestaticapps.net), it is 100% WEB APP!
  const isRemoteWebDomain = 
    window.location.hostname.includes("azurestaticapps.net") || 
    window.location.hostname.includes("github.io") ||
    window.location.hostname.includes("vercel.app") ||
    (window.location.protocol.startsWith("http") && 
     window.location.hostname !== "localhost" && 
     window.location.hostname !== "127.0.0.1" && 
     !window.location.hostname.startsWith("192.168."));

  if (isRemoteWebDomain) {
    return false;
  }

  const platform = Capacitor.getPlatform();
  return (platform === "android" || platform === "ios" || Capacitor.isNativePlatform()) && platform !== "web";
};

export const useAppUpdate = () => {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const isNativeApp = isRunningInNativeApp();

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
        // Show update banner ONLY if remote versionCode is strictly greater than installed native app version
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
