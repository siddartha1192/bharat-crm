import { Task } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onDelete?: (task: Task) => void;
}

const priorityConfig = {
  low: { color: 'bg-muted text-muted-foreground', icon: null },
  medium: { color: 'bg-secondary/10 text-secondary border-secondary/20', icon: null },
  high: { color: 'bg-warning/10 text-warning border-warning/20', icon: AlertCircle },
  urgent: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle },
};

const statusConfig = {
  'todo': { color: 'bg-muted', text: 'To Do' },
  'in-progress': { color: 'bg-secondary', text: 'In Progress' },
  'completed': { color: 'bg-success', text: 'Completed' },
};

export function TaskCard({ task, onClick, onDelete }: TaskCardProps) {
  const isOverdue = task.status !== 'completed' && task.dueDate < new Date();
  const isDueToday = task.dueDate.toDateString() === new Date().toDateString();
  const priority = priorityConfig[task.priority];
  const PriorityIcon = priority.icon;
  
  const initials = task.assignee
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card 
      className={cn(
        "p-4 hover:shadow-medium transition-all cursor-pointer group",
        task.status === 'completed' && "opacity-75"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold text-foreground mb-1 group-hover:text-primary transition-colors",
            task.status === 'completed' && "line-through"
          )}>
            {task.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {task.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
          ) : (
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex-shrink-0",
              "border-muted group-hover:border-primary transition-colors"
            )} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Badge variant="outline" className={cn("text-xs font-medium border", priority.color)}>
          {PriorityIcon && <PriorityIcon className="w-3 h-3 mr-1" />}
          {task.priority}
        </Badge>

        <Badge variant="outline" className="text-xs">
          <div className={cn("w-2 h-2 rounded-full mr-1.5", statusConfig[task.status].color)} />
          {statusConfig[task.status].text}
        </Badge>

        {task.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-accent text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground">{task.assignee}</span>
        </div>

        <div className={cn(
          "flex items-center gap-1.5",
          isOverdue && "text-destructive",
          isDueToday && !isOverdue && "text-warning"
        )}>
          <Clock className="w-3.5 h-3.5" />
          <span>
            {isOverdue ? 'Overdue' : formatDistanceToNow(task.dueDate, { addSuffix: true })}
          </span>
        </div>
      </div>
    </Card>
  );
}
