import { useState, useEffect, useRef } from 'react';
import { Task } from '@/types/task';
import { tasksAPI } from '@/lib/api';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskListView } from '@/components/tasks/TaskListView';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AdvancedFilters, FilterConfig } from '@/components/ui/advanced-filters';
import { Pagination } from '@/components/ui/pagination';
import { Plus, Search, Loader2, Download, Upload, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';
import { exportTasksToCSV, importTasksFromCSV } from '@/lib/csvUtils';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list'); // Default to list view
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({});

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'todo', label: 'To Do' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
      ],
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'tags',
      placeholder: 'Enter tags (comma-separated)',
    },
  ];

  // Fetch tasks from API
  useEffect(() => {
    fetchTasks();
  }, [currentPage, itemsPerPage, searchQuery, advancedFilters]);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params: Record<string, any> = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      // Add search query
      if (searchQuery) {
        params.search = searchQuery;
      }

      // Add advanced filters
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params[key] = value;
        }
      });

      const response = await tasksAPI.getAll(params);

      // Handle paginated response
      if (response.data) {
        setTasks(response.data);
        setTotalItems(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      } else {
        // Fallback for non-paginated response
        setTasks(response);
        setTotalItems(response.length);
        setTotalPages(1);
      }
    } catch (error) {
      toast.error('Failed to load tasks. Please check if the backend is running.');
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleExport = async () => {
    try {
      toast.success('Exporting... Fetching all tasks. Please wait...');

      // Fetch ALL tasks (not just current page) with current filters
      const params: Record<string, any> = {
        limit: 50000, // High limit to get all records
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      // Apply current search and filters
      if (searchQuery) params.search = searchQuery;
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value && value !== 'all') params[key] = value;
      });

      const response = await tasksAPI.getAll(params);
      const allTasks = response.data || response;

      console.log('Exporting tasks:', allTasks.length);
      exportTasksToCSV(allTasks, `tasks-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success(`${allTasks.length} tasks exported to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export tasks. Please try again.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Importing file:', file.name);

    try {
      const importedTasks = await importTasksFromCSV(file);
      console.log('Imported tasks:', importedTasks.length);

      // Create all imported tasks in the backend
      for (const task of importedTasks) {
        await tasksAPI.create(task);
      }

      toast.success(`${importedTasks.length} tasks imported successfully`);

      // Refresh the tasks list
      fetchTasks();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import tasks. Please check the file format.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Tasks</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your follow-ups and to-dos</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".csv"
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <ProtectedFeature permission="tasks:export">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </ProtectedFeature>
          <ProtectedFeature permission="tasks:create">
            <Button onClick={handleCreateTask}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </ProtectedFeature>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks by title or description..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
              />
            </div>
            <div className="flex gap-2">
              <AdvancedFilters
                filters={filterConfigs}
                values={advancedFilters}
                onChange={(filters) => {
                  setAdvancedFilters(filters);
                  setCurrentPage(1); // Reset to first page on filter change
                }}
                onReset={() => {
                  setAdvancedFilters({});
                  setCurrentPage(1);
                }}
              />
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Card
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4 mr-2" />
                  List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tasks Grid/List */}
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
          {viewMode === 'card' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleEditTask(task)}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          ) : (
            <TaskListView
              tasks={tasks}
              onClick={handleEditTask}
              onDelete={handleDeleteTask}
            />
          )}

          {tasks.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No tasks found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </Card>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Card>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newLimit) => {
                  setItemsPerPage(newLimit);
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}
              />
            </Card>
          )}
        </>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        onSave={handleSaveTask}
      />
    </div>
  );
}
