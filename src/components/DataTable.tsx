import { ReactNode } from "react";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface Column {
  header: string;
  accessor?: string;
  render?: (row: any) => ReactNode;
  align?: "left" | "right" | "center";
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const DataTable = ({ 
  columns, 
  data, 
  searchTerm = "", 
  onSearchChange,
  emptyMessage = "No records found",
  emptyIcon,
  title,
  description,
  actions
}: DataTableProps) => {
  return (
    <motion.div variants={item} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {(title || onSearchChange || actions) && (
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1">
            {title && <h3 className="text-lg font-display font-bold text-slate-900">{title}</h3>}
            {description && <p className="text-sm text-slate-500">{description}</p>}
            {onSearchChange && (
              <div className={cn("relative w-full sm:max-w-md", title && "mt-4")}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={cn(
                    "px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, rowIdx) => (
              <tr key={row.id || rowIdx} className="group hover:bg-slate-50/50 transition-colors">
                {columns.map((col, colIdx) => (
                  <td 
                    key={colIdx} 
                    className={cn(
                      "px-8 py-5",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center"
                    )}
                  >
                    {col.render ? col.render(row) : (col.accessor ? row[col.accessor] : null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {data.length === 0 && (
          <div className="p-20 text-center">
            {emptyIcon && (
              <div className="bg-slate-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                {emptyIcon}
              </div>
            )}
            <h3 className="text-slate-900 font-bold">{emptyMessage}</h3>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
        <p className="text-sm text-slate-500 font-medium">Showing {data.length} records</p>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
