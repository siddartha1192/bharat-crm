import { useAuth } from '@/contexts/AuthContext';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';

export function DebugPlanInfo() {
  const { user } = useAuth();
  const features = usePlanFeatures();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-xs z-50">
      <div className="font-bold mb-2">Plan Debug Info:</div>
      <div>Plan: {user?.tenant?.plan || 'No tenant'}</div>
      <div>Has AI: {features.hasAIFeatures ? 'YES' : 'NO'}</div>
      <div>Plan Name: {features.planName}</div>
      <div className="mt-2 text-gray-400">
        User ID: {user?.id?.slice(0, 8)}
      </div>
    </div>
  );
}
