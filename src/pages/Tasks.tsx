import { useState, useEffect } from 'react';
import { Task } from '@/types/task';
import { tasksAPI } from '@/lib/api';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'completed'>('all');

  // Fetch tasks from API
  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksAPI.getAll({
        status: filter !== 'all' ? filter : undefined
      });
      setTasks(data);
    } catch (error) {
      toast.error('Failed to load tasks. Please check if the backend is running.');
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => 
    filter === 'all' ? true : task.status === filter
  );

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (selectedTask) {
        await tasksAPI.update(selectedTask.id, taskData);
        toast.success('Task updated successfully');
      } else {
        await tasksAPI.create(taskData);
        toast.success('Task created successfully');
      }
      setSelectedTask(undefined);
      // Refresh the tasks list
      fetchTasks();
    } catch (error) {
      toast.error('Failed to save task. Please try again.');
      console.error('Error saving task:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(undefined);
    setDialogOpen(true);
  };

  const handleDeleteTask = async (task: Task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      try {
        await tasksAPI.delete(task.id);
        toast.success('Task deleted successfully');
        fetchTasks();
      } catch (error) {
        toast.error('Failed to delete task. Please try again.');
        console.error('Error deleting task:', error);
      }
    }
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
          {loading ? (
            <Card className="p-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Loading tasks...</h3>
              <p className="text-muted-foreground">
                Please wait while we fetch your data
              </p>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleEditTask(task)}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>

              {filteredTasks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No tasks found in this category</p>
                </div>
              )}
            </>
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
