import { useState, useEffect } from "react";

export interface VersionInfo {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
  mandatory?: boolean;
}

const CURRENT_VERSION_CODE = 1; // Current build versionCode
const CURRENT_VERSION_NAME = "1.0.0";

export const useAppUpdate = () => {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkVersion = async () => {
    try {
      const res = await fetch("/downloads/version.json", { cache: "no-store" });
      if (res.ok) {
        const data: VersionInfo = await res.json();
        if (data && data.versionCode > CURRENT_VERSION_CODE) {
          setUpdateInfo(data);
          setIsUpdateAvailable(true);
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
    isUpdateAvailable: isUpdateAvailable && !isDismissed,
    dismissUpdate,
    checkVersion
  };
};
