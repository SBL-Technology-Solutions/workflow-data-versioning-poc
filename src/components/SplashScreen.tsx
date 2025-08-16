import React from "react";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";

interface SplashScreenProps {
  show: boolean;
  onDismiss?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ show, onDismiss }) => {
  return (
    <Dialog open={show} onOpenChange={(open) => !open && onDismiss?.()}>
      <DialogPortal>
        <DialogOverlay className="bg-black" />
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black border-none max-w-none h-screen w-screen p-0 transition-opacity duration-700"
          style={{ transitionProperty: "opacity", willChange: "opacity" }}
        >
        <div className="flex flex-col items-center w-full max-w-lg px-4 mt-[-10vh]">
          {/* Abstract Workflow Icon */}
          <div className="splash-icon-anim mb-0">
            <img
              src="/assets/icon.svg"
              alt="ApproveOS Icon"
              className="w-32 h-32 md:w-40 md:h-40 block"
              style={{ filter: "brightness(2) drop-shadow(0 0 3px #fff) grayscale(1)" }}
            />
          </div>
          
          {/* Title Animation */}
          <DialogHeader className="space-y-0 text-center">
            <DialogTitle className="splash-title-anim text-white text-3xl md:text-5xl font-medium tracking-tight text-center whitespace-nowrap mb-6">
              Welcome to ApproveOS
            </DialogTitle>
            
            {/* Subtitle Animation */}
            <DialogDescription className="splash-subtitle-anim text-zinc-300 text-lg text-center max-w-md mb-6">
              Effortlessly manage, automate, and track approvals<br/>
              across your organization. ApproveOS brings clarity<br/>
              and speed to every workflow.
            </DialogDescription>
          </DialogHeader>
          
          {/* Button Animation */}
          <button
            className="splash-btn-anim px-24 py-3 rounded-xl border text-base text-white font-normal shadow-lg transition-transform duration-150 hover:scale-[1.03] focus:outline-none focus:ring-2"
            style={{ backgroundColor: '#6C5B7B', borderColor: '#4B3C57', boxShadow: '0 2px 16px 0 rgba(0,0,0,0.10)' }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#4B3C57')}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = '#6C5B7B')}
            onClick={onDismiss}
          >
            Get started
          </button>
        </div>
        
        <style>{`
          .splash-icon-anim {
            opacity: 0;
            transform: scale(1.35);
            animation: splash-icon-in 1.8s cubic-bezier(0.4,0,0.2,1) forwards;
          }
          .splash-title-anim {
            opacity: 0;
            transform: translateY(16px);
            animation: splash-title-in 0.5s 0.6s cubic-bezier(0.4,0,0.2,1) forwards;
          }
          .splash-subtitle-anim {
            opacity: 0;
            transform: translateY(16px);
            animation: splash-subtitle-in 0.5s 0.8s cubic-bezier(0.4,0,0.2,1) forwards;
          }
          .splash-btn-anim {
            opacity: 0;
            transform: translateY(16px);
            animation: splash-btn-in 0.5s 1.0s cubic-bezier(0.4,0,0.2,1) forwards;
          }
          @keyframes splash-icon-in {
            0% { opacity: 0; transform: scale(10) translateY(60px); }
            60% { opacity: 1; transform: scale(1) translateY(0); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes splash-title-in {
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes splash-subtitle-in {
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes splash-btn-in {
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        </div>
      </DialogPortal>
    </Dialog>
  );
};