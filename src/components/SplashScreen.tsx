import React from "react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import iconUrl from "@/assets/approveOS_icon_optimized.svg?url";

interface SplashScreenProps {
  show: boolean;
  onDismiss?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ show, onDismiss }) => {
  return (
    <Dialog open={show} onOpenChange={(open) => !open && onDismiss?.()}>
      <DialogContent 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black border-none p-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center w-full max-w-lg px-4 mt-[-10vh]">
          {/* Abstract Workflow Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 20, y: 800 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              duration: 1.2, 
              ease: [0.16, 1, 0.3, 1]
            }}
            className="mb-0"
          >
            <img
              src={iconUrl}
              alt="ApproveOS Icon"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable="false"
              className="w-32 h-32 md:w-40 md:h-40 block brightness-200 drop-shadow-[0_0_3px_#fff] grayscale"
            />
          </motion.div>
          
          {/* Title Animation */}
          <DialogHeader className="space-y-0 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: 0.6,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              <DialogTitle className="text-white text-3xl md:text-5xl font-medium tracking-tight text-center whitespace-nowrap mb-2">
                Welcome to ApproveOS
              </DialogTitle>
            </motion.div>
            
            {/* Subtitle Animation */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: 0.8,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="w-full flex justify-center"
            >
              <DialogDescription className="text-zinc-300 text-lg text-center max-w-md mb-6">
                Effortlessly manage, automate, and track approvals<br/>
                across your organization. ApproveOS brings clarity<br/>
                and speed to every workflow.
              </DialogDescription>
            </motion.div>
          </DialogHeader>
          
          {/* Button Animation */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: 1.0,
              ease: [0.4, 0, 0.2, 1]
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              onClick={onDismiss}
              className="px-24 py-3 rounded-lg bg-[#6C5B7B] hover:bg-[#4B3C57] text-gray-200"
            >
              Get started
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};