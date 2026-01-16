import { useState, useEffect } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TrialCountdownProps {
  subscriptionEnd: string; // ISO date string
  plan: string;
}

export function TrialCountdown({ subscriptionEnd, plan }: TrialCountdownProps) {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    expired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    expired: false,
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const endTime = new Date(subscriptionEnd).getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          expired: true,
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({
        days,
        hours,
        minutes,
        expired: false,
      });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [subscriptionEnd]);

  // Only show for FREE plan users
  if (plan !== 'FREE') {
    return null;
  }

  const getVariant = () => {
    if (timeRemaining.expired) return 'destructive';
    if (timeRemaining.days <= 3) return 'destructive';
    if (timeRemaining.days <= 7) return 'secondary';
    return 'default';
  };

  const getColorClass = () => {
    if (timeRemaining.expired) return 'text-destructive';
    if (timeRemaining.days <= 3) return 'text-red-600 dark:text-red-400';
    if (timeRemaining.days <= 7) return 'text-orange-600 dark:text-orange-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${getColorClass()} hover:bg-muted`}
            onClick={() => navigate('/pricing')}
          >
            <Clock className="w-4 h-4" />
            <div className="flex items-center gap-1 font-mono text-sm">
              {timeRemaining.expired ? (
                <span className="font-semibold">Trial Expired</span>
              ) : (
                <>
                  <span className="font-semibold">{timeRemaining.days}</span>
                  <span className="text-xs">d</span>
                  <span className="font-semibold mx-1">{timeRemaining.hours}</span>
                  <span className="text-xs">h</span>
                </>
              )}
            </div>
            {!timeRemaining.expired && timeRemaining.days <= 7 && (
              <Badge variant={getVariant()} className="ml-1 text-xs px-1 py-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Upgrade
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">
              {timeRemaining.expired
                ? 'Your trial has expired'
                : `Trial ends in ${timeRemaining.days} days, ${timeRemaining.hours} hours`}
            </p>
            <p className="text-xs text-muted-foreground">
              {timeRemaining.expired
                ? 'Upgrade to continue using all features'
                : 'Upgrade now to unlock unlimited access and premium features'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
