import { Task } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  User,
  Edit,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface TaskListViewProps {
  tasks: Task[];
  onClick?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const statusColors = {
  'todo': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'in-progress': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'completed': 'bg-green-500/10 text-green-600 border-green-500/20',
  'cancelled': 'bg-red-500/10 text-red-600 border-red-500/20',
};

const priorityColors = {
  'low': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'medium': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'high': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'urgent': 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function TaskListView({ tasks, onClick, onDelete }: TaskListViewProps) {
  return (
    <div className="bg-card rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-semibold text-sm">Task</th>
              <th className="text-left p-4 font-semibold text-sm">Status</th>
              <th className="text-left p-4 font-semibold text-sm">Priority</th>
              <th className="text-left p-4 font-semibold text-sm">Assignee</th>
              <th className="text-left p-4 font-semibold text-sm">Due Date</th>
              <th className="text-left p-4 font-semibold text-sm">Tags</th>
              <th className="text-left p-4 font-semibold text-sm">Created</th>
              <th className="text-right p-4 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr
                key={task.id}
                className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                }`}
                onClick={() => onClick?.(task)}
              >
                <td className="p-4">
                  <div className="font-medium text-foreground">{task.title}</div>
                  {task.description && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {task.description}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <Badge className={`${statusColors[task.status]} border`}>
                    {task.status === 'in-progress' ? 'In Progress' : task.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <Badge className={`${priorityColors[task.priority]} border`}>
                    {task.priority}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{task.assignee || 'Unassigned'}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{format(task.dueDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(task.dueDate, { addSuffix: true })}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {task.tags?.slice(0, 2).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {task.tags && task.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{task.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDistanceToNow(task.createdAt, { addSuffix: true })}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    {onClick && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClick(task);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(task);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
