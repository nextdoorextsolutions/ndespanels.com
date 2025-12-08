import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";

type PipelineStatus =
  | "Lead"
  | "Appointment Set"
  | "Prospect"
  | "Approved"
  | "Project Scheduled"
  | "Completed"
  | "Invoiced"
  | "Closed Deal"
  | "Lien Legal"
  | "Closed Lost";

interface JobPipelineTrackerProps {
  currentStatus: PipelineStatus;
  className?: string;
}

const mainStages: PipelineStatus[] = [
  "Lead",
  "Appointment Set",
  "Prospect",
  "Approved",
  "Project Scheduled",
  "Completed",
  "Invoiced",
  "Closed Deal",
];

const exceptionStages: PipelineStatus[] = ["Lien Legal", "Closed Lost"];

export function JobPipelineTracker({
  currentStatus,
  className = "",
}: JobPipelineTrackerProps) {
  const [animationKey, setAnimationKey] = useState(0);
  const currentIndex = mainStages.indexOf(currentStatus);
  const isException = exceptionStages.includes(currentStatus);

  // Trigger wave animation when status changes
  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [currentStatus]);

  const getStageStyle = (stage: PipelineStatus, index: number) => {
    const isActive = stage === currentStatus;
    const isCompleted = !isException && index < currentIndex;
    const isClosedDeal = stage === "Closed Deal";

    if (isActive) {
      if (isClosedDeal) {
        return "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.5)]";
      }
      return "bg-teal-500/20 border-teal-400 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.5)]";
    }

    if (isCompleted) {
      return "bg-emerald-500/10 border-emerald-500/50 text-emerald-400";
    }

    return "bg-slate-800/30 border-slate-700/50 text-slate-500";
  };

  const getExceptionStyle = (stage: PipelineStatus) => {
    const isActive = stage === currentStatus;

    if (stage === "Lien Legal") {
      return isActive
        ? "bg-red-500/20 border-red-400 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
        : "bg-red-950/20 border-red-900/50 text-red-700/50";
    }

    // Closed Lost
    return isActive
      ? "bg-slate-600/20 border-slate-500 text-slate-300 shadow-[0_0_15px_rgba(100,116,139,0.4)]"
      : "bg-slate-900/30 border-slate-800/50 text-slate-600";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Pipeline Container */}
      <div className="relative backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-full px-6 py-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          {mainStages.map((stage, index) => {
            const isActive = stage === currentStatus;
            const isCompleted = !isException && index < currentIndex;
            const isClosedDeal = stage === "Closed Deal";
            const showConnector = index < mainStages.length - 1;

            // Calculate delay for wave animation
            const waveDelay = index * 0.08;

            return (
              <div key={stage} className="flex items-center gap-3">
                {/* Stage Node */}
                <motion.div
                  key={`${stage}-${animationKey}`}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{
                    scale: isActive ? [1, 1.05, 1] : 1,
                    opacity: isActive || isCompleted ? 1 : 0.6,
                  }}
                  transition={{
                    scale: {
                      duration: 0.6,
                      repeat: isActive ? Infinity : 0,
                      repeatType: "reverse",
                      ease: "easeInOut",
                    },
                    opacity: {
                      delay: waveDelay,
                      duration: 0.3,
                    },
                  }}
                  className="relative"
                >
                  {/* Closed Deal Icon */}
                  {isClosedDeal && isActive && (
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2"
                    >
                      <Home className="w-5 h-5 text-amber-400" />
                    </motion.div>
                  )}

                  <div
                    className={`
                      relative px-4 py-2 rounded-full border-2 
                      transition-all duration-300 whitespace-nowrap
                      text-xs font-semibold tracking-wide
                      ${getStageStyle(stage, index)}
                    `}
                  >
                    {stage}

                    {/* Active pulse ring */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-current"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 1.3, opacity: 0 }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                      />
                    )}
                  </div>
                </motion.div>

                {/* Connector Arrow */}
                {showConnector && (
                  <motion.div
                    key={`connector-${index}-${animationKey}`}
                    initial={{ opacity: 0.3, scaleX: 0.8 }}
                    animate={{
                      opacity: isCompleted || index < currentIndex ? 0.8 : 0.3,
                      scaleX: 1,
                    }}
                    transition={{
                      delay: waveDelay + 0.1,
                      duration: 0.3,
                    }}
                    className="flex items-center"
                  >
                    <svg
                      width="24"
                      height="12"
                      viewBox="0 0 24 12"
                      fill="none"
                      className={`
                        transition-colors duration-300
                        ${
                          isCompleted || index < currentIndex
                            ? "text-emerald-500/60"
                            : "text-slate-700"
                        }
                      `}
                    >
                      <path
                        d="M0 6H20M20 6L15 1M20 6L15 11"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exception States Row */}
      <div className="flex items-center justify-center gap-4">
        {exceptionStages.map((stage) => {
          const isActive = stage === currentStatus;

          return (
            <motion.div
              key={stage}
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{
                scale: isActive ? [1, 1.05, 1] : 0.95,
                opacity: isActive ? 1 : 0.7,
              }}
              transition={{
                scale: {
                  duration: 0.8,
                  repeat: isActive ? Infinity : 0,
                  repeatType: "reverse",
                },
              }}
              className="relative"
            >
              <div
                className={`
                  px-6 py-2 rounded-full border-2
                  transition-all duration-300
                  text-xs font-semibold tracking-wide
                  backdrop-blur-sm
                  ${getExceptionStyle(stage)}
                `}
              >
                {stage}

                {/* Active pulse ring for exceptions */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-current"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.3, opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
