import { ReactNode } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export const BaseModal = ({ isOpen, onClose, title, description, children, className, size = "md" }: BaseModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative bg-white w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-100",
              sizeClasses[size],
              className
            )}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-2xl font-display font-bold text-slate-900 truncate">{title}</h2>
                {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0 ml-4"
              >
                <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

