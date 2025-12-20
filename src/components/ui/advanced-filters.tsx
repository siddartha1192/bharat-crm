import { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { Badge } from './badge';
import { Filter, X, ChevronDown } from 'lucide-react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'tags';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface AdvancedFiltersProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  onReset: () => void;
}

export function AdvancedFilters({ filters, values, onChange, onReset }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.values(values).filter(
    (v) => v && v !== 'all' && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const handleChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value });
  };

  const handleRemoveFilter = (key: string) => {
    const newValues = { ...values };
    delete newValues[key];
    onChange(newValues);
  };

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className="w-4 h-4 ml-auto" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onReset();
                    setIsOpen(false);
                  }}
                >
                  Reset all
                </Button>
              )}
            </div>

            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <Label htmlFor={filter.key}>{filter.label}</Label>

                {filter.type === 'select' && filter.options && (
                  <Select
                    value={values[filter.key] || 'all'}
                    onValueChange={(value) => handleChange(filter.key, value)}
                  >
                    <SelectTrigger id={filter.key}>
                      <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filter.type === 'text' && (
                  <Input
                    id={filter.key}
                    value={values[filter.key] || ''}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    placeholder={filter.placeholder || `Enter ${filter.label}`}
                  />
                )}

                {filter.type === 'tags' && (
                  <Input
                    id={filter.key}
                    value={values[filter.key] || ''}
                    onChange={(e) => handleChange(filter.key, e.target.value)}
                    placeholder={filter.placeholder || 'Enter tags separated by commas'}
                  />
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filters badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(values).map(([key, value]) => {
            if (!value || value === 'all') return null;

            const filter = filters.find((f) => f.key === key);
            if (!filter) return null;

            let displayValue = value;
            if (filter.type === 'select' && filter.options) {
              const option = filter.options.find((o) => o.value === value);
              displayValue = option?.label || value;
            }

            return (
              <Badge key={key} variant="secondary" className="gap-1">
                <span className="text-xs">
                  {filter.label}: {displayValue}
                </span>
                <button
                  onClick={() => handleRemoveFilter(key)}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
