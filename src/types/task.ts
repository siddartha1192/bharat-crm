export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
  assignedTo: string;
  tags: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  dueToday: number;
}
