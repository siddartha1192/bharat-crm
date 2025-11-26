import { useState } from 'react';
import { Task } from '@/types/task';
import { mockTasks } from '@/lib/mockData';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'completed'>('all');

  const filteredTasks = tasks.filter(task => 
    filter === 'all' ? true : task.status === filter
  );

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (selectedTask) {
      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, ...taskData } : t));
      toast.success('Task updated successfully');
    } else {
      setTasks([...tasks, taskData as Task]);
      toast.success('Task created successfully');
    }
    setSelectedTask(undefined);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
          <p className="text-muted-foreground">Manage your follow-ups and to-dos</p>
        </div>
        <Button onClick={handleCreateTask} size="lg" className="shadow-primary">
          <Plus className="w-5 h-5 mr-2" />
          New Task
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="todo">To Do</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        <TabsContent value={filter} className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClick={() => handleEditTask(task)}
              />
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tasks found in this category</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        onSave={handleSaveTask}
      />
    </div>
  );
}
