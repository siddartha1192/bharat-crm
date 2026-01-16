import { useAuth } from '@/contexts/AuthContext';

interface PlanFeatures {
  hasAIFeatures: boolean;
  hasAPIAccess: boolean;
  hasPremiumFeatures: boolean;
  maxUsers: number;
  planName: string;
  isFreePlan: boolean;
  isStandardPlan: boolean;
  isProfessionalPlan: boolean;
  isEnterprisePlan: boolean;
}

/**
 * Hook to check available features based on user's subscription plan
 */
export function usePlanFeatures(): PlanFeatures {
  const { user } = useAuth();
  const plan = user?.tenant?.plan || 'FREE';

  // Define feature availability per plan
  const features: Record<string, PlanFeatures> = {
    FREE: {
      hasAIFeatures: true, // FREE trial gets all features
      hasAPIAccess: false,
      hasPremiumFeatures: true,
      maxUsers: 5,
      planName: 'Free Trial',
      isFreePlan: true,
      isStandardPlan: false,
      isProfessionalPlan: false,
      isEnterprisePlan: false,
    },
    STANDARD: {
      hasAIFeatures: false, // STANDARD doesn't have AI features
      hasAPIAccess: false,
      hasPremiumFeatures: true,
      maxUsers: 25,
      planName: 'Standard',
      isFreePlan: false,
      isStandardPlan: true,
      isProfessionalPlan: false,
      isEnterprisePlan: false,
    },
    PROFESSIONAL: {
      hasAIFeatures: true, // PROFESSIONAL has all features including AI
      hasAPIAccess: false,
      hasPremiumFeatures: true,
      maxUsers: 100,
      planName: 'Professional',
      isFreePlan: false,
      isStandardPlan: false,
      isProfessionalPlan: true,
      isEnterprisePlan: false,
    },
    ENTERPRISE: {
      hasAIFeatures: true, // ENTERPRISE has all features
      hasAPIAccess: true, // Only ENTERPRISE gets API access
      hasPremiumFeatures: true,
      maxUsers: 500,
      planName: 'Enterprise',
      isFreePlan: false,
      isStandardPlan: false,
      isProfessionalPlan: false,
      isEnterprisePlan: true,
    },
  };

  return features[plan] || features.FREE;
}
