import React from "react";
import { Download, X, Sparkles } from "lucide-react";
import { VersionInfo } from "../hooks/useAppUpdate";

interface UpdateBannerProps {
  updateInfo: VersionInfo;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ updateInfo, onDismiss }) => {
  return (
    <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 border-b border-emerald-500/20 text-xs z-50">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="truncate">
          <span className="font-bold text-emerald-300 mr-1.5">New Update v{updateInfo.versionName}</span>
          <span className="text-slate-300 hidden sm:inline">{updateInfo.releaseNotes}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={updateInfo.downloadUrl || "https://github.com/tessmacm/InvestPro/releases/download/v1.0.0/app-debug.apk"}
          download="InvestPro.apk"
          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Update APK</span>
        </a>
        <button
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          title="Dismiss update banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
