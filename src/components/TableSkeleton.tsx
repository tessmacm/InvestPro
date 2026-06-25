import React from "react";

export const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 rounded-xl bg-slate-200" />
      <div className="w-12 h-6 bg-slate-200 rounded-lg" />
    </div>
    <div className="w-24 h-3 bg-slate-200 rounded mb-2" />
    <div className="w-16 h-8 bg-slate-200 rounded" />
  </div>
);

export const TableSkeleton = () => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4 animate-pulse">
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="h-6 bg-slate-200 rounded w-1/4" />
      <div className="h-10 bg-slate-200 rounded-xl w-32" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
          <div className="flex items-center gap-4 w-1/2">
            <div className="w-10 h-10 bg-slate-200 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
          <div className="h-6 bg-slate-200 rounded w-24" />
          <div className="h-8 bg-slate-200 rounded-xl w-32" />
        </div>
      ))}
    </div>
  </div>
);
