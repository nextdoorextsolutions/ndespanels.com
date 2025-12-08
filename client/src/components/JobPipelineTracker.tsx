import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";

// Accept both snake_case (from API) and Title Case (display)
type PipelineStatus = string;

interface JobPipelineTrackerProps {
  currentStatus: PipelineStatus;
  className?: string;
}

// Status mapping: snake_case -> Title Case
const STATUS_MAP: Record<string, string> = {
  lead: "Lead",
  appointment_set: "Appointment Set",
  prospect: "Prospect",
  approved: "Approved",
  project_scheduled: "Project Scheduled",
  completed: "Completed",
  invoiced: "Invoiced",
  closed_deal: "Closed Deal",
  lien_legal: "Lien Legal",
  closed_lost: "Closed Lost",
};

// Reverse mapping for comparison
const REVERSE_STATUS_MAP: Record<string, string> = Object.entries(STATUS_MAP).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {}
);

const mainStages = [
  "Lead",
  "Appointment Set",
  "Prospect",
  "Approved",
  "Project Scheduled",
  "Completed",
  "Invoiced",
  "Closed Deal",
];

const exceptionStages = ["Lien Legal", "Closed Lost"];

// Normalize status to Title Case for consistent comparison
const normalizeStatus = (status: string): string => {
  return STATUS_MAP[status] || status;
};

export function JobPipelineTracker({
  currentStatus,
  className = "",
}: JobPipelineTrackerProps) {
  const [animationKey, setAnimationKey] = useState(0);
  
  // Normalize the incoming status
  const normalizedStatus = normalizeStatus(currentStatus);
  const currentIndex = mainStages.indexOf(normalizedStatus);
  const isException = exceptionStages.includes(normalizedStatus);

  // Trigger wave animation when status changes
  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [normalizedStatus]);

  const getStageStyle = (stage: string, index: number) => {
    const isActive = stage === normalizedStatus;
    const isCompleted = !isException && index < currentIndex;
    const isClosedDeal = stage === "Closed Deal";

    if (isActive) {
      if (isClosedDeal) {
        return "bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.6)] font-bold";
      }
      return "bg-[#00d4aa]/30 border-[#00d4aa] text-white shadow-[0_0_30px_rgba(0,212,170,0.7)] font-bold";
    }

    if (isCompleted) {
      return "bg-emerald-500/20 border-emerald-500/60 text-emerald-300";
    }

    return "bg-slate-900/50 border-slate-700/30 text-slate-600";
  };

  const getExceptionStyle = (stage: string) => {
    const isActive = stage === normalizedStatus;

    if (stage === "Lien Legal") {
      return isActive
        ? "bg-red-500/30 border-red-400 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.6)] font-bold"
        : "bg-red-950/20 border-red-900/50 text-red-700/50";
    }

    // Closed Lost
    return isActive
      ? "bg-slate-600/30 border-slate-400 text-slate-200 shadow-[0_0_25px_rgba(100,116,139,0.5)] font-bold"
      : "bg-slate-900/30 border-slate-800/50 text-slate-600";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Pipeline Container */}
      <div className="relative backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-full px-6 py-4 shadow-2xl">
        <motion.div 
          className="flex items-center justify-between gap-3"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1,
              },
            },
          }}
          initial="hidden"
          animate="visible"
          key={animationKey}
        >
          {mainStages.map((stage, index) => {
            const isActive = stage === currentStatus;
            const isCompleted = !isException && index < currentIndex;
            const isClosedDeal = stage === "Closed Deal";
            const showConnector = index < mainStages.length - 1;

            // Calculate delay for wave animation
            const waveDelay = index * 0.08;

            return (
              <motion.div 
                key={stage} 
                className="flex items-center gap-3"
                variants={{
                  hidden: { scale: 0.8, opacity: 0 },
                  visible: { 
                    scale: 1, 
                    opacity: 1,
                    transition: {
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                    },
                  },
                }}
              >
                {/* Stage Node */}
                <motion.div
                  animate={{
                    scale: isActive ? [1, 1.08, 1] : 1,
                  }}
                  transition={{
                    scale: {
                      duration: 1.5,
                      repeat: isActive ? Infinity : 0,
                      repeatType: "reverse",
                      ease: "easeInOut",
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
                    variants={{
                      hidden: { opacity: 0, scaleX: 0 },
                      visible: { 
                        opacity: isCompleted || index < currentIndex ? 0.8 : 0.3,
                        scaleX: 1,
                        transition: {
                          duration: 0.4,
                          ease: "easeOut",
                        },
                      },
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
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Exception States Row */}
      <div className="flex items-center justify-center gap-4">
        {exceptionStages.map((stage) => {
          const isActive = stage === currentStatus;

          return (
            <motion.div
              key={stage}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{
                scale: isActive ? [1, 1.08, 1] : 0.95,
                opacity: isActive ? 1 : 0.6,
              }}
              transition={{
                scale: {
                  duration: 1.5,
                  repeat: isActive ? Infinity : 0,
                  repeatType: "reverse",
                  ease: "easeInOut",
                },
                opacity: {
                  duration: 0.3,
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
