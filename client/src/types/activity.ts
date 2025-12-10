/**
 * Activity Types for Threaded Timeline
 * Supports threaded replies and topic tagging
 */

export type ActivityTag = 
  | "urgent" 
  | "material_order" 
  | "production" 
  | "inspection" 
  | "billing";

export interface Activity {
  id: number;
  description: string;
  activityType: string;
  createdAt: Date | string;
  parentId?: number | null;
  tags?: ActivityTag[];
  userId?: number | null;
  user?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  metadata?: any;
  reportRequestId?: number;
}

export interface ThreadedActivity extends Activity {
  replies: ThreadedActivity[];
}

export const TAG_CONFIG: Record<ActivityTag, { 
  label: string; 
  emoji: string; 
  color: string;
  description: string;
}> = {
  urgent: { 
    label: "Urgent", 
    emoji: "🔴", 
    color: "bg-red-500/20 text-red-400 border-red-500/50",
    description: "Requires immediate attention"
  },
  material_order: { 
    label: "Material Order", 
    emoji: "🟡", 
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    description: "Related to material ordering"
  },
  production: { 
    label: "Production", 
    emoji: "🔵", 
    color: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    description: "Field work and installation"
  },
  inspection: { 
    label: "Inspection", 
    emoji: "🟢", 
    color: "bg-green-500/20 text-green-400 border-green-500/50",
    description: "Inspection and quality checks"
  },
  billing: { 
    label: "Billing", 
    emoji: "🟣", 
    color: "bg-purple-500/20 text-purple-400 border-purple-500/50",
    description: "Invoicing and payments"
  },
};
