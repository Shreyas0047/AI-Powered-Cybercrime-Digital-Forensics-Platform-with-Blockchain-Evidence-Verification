/**
 * Enterprise Data Table Component
 * Professional table with sorting, filtering, and expandable rows
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  MoreHorizontal,
} from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../design-system';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  expandable?: boolean;
  expandRender?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  expandable = false,
  expandRender,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
}: DataTableProps<T>) {
  const { isDark } = useTheme();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  };

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    )}>
      {/* Search Bar */}
      {searchable && (
        <div className={cn(
          'flex items-center px-4 py-3 border-b',
          isDark ? 'border-slate-700/50' : 'border-slate-200'
        )}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
              onSearch?.(e.target.value);
            }}
            className={cn(
              'flex-1 px-3 py-2 text-sm rounded-lg border outline-none',
              'bg-transparent transition-colors',
              isDark
                ? 'border-slate-600 focus:border-blue-500 text-slate-200 placeholder:text-slate-500'
                : 'border-slate-200 focus:border-blue-500 text-slate-700 placeholder:text-slate-400'
            )}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={cn(
              isDark ? 'bg-slate-800/50' : 'bg-slate-50'
            )}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider',
                    'transition-colors',
                    isDark ? 'text-slate-400' : 'text-slate-500',
                    column.sortable && 'cursor-pointer hover:text-slate-600 dark:hover:text-slate-300',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    column.width && column.width
                  )}
                  style={column.width ? { width: column.width } : undefined}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={cn(
                    'flex items-center gap-1',
                    column.align === 'right' && 'justify-end',
                    column.align === 'center' && 'justify-center'
                  )}>
                    {column.label}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <p className={cn(
                    'text-sm',
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  )}>
                    {emptyMessage}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => {
                const key = String(item[keyField]);
                const isExpanded = expandedRow === key;
                const isClickable = onRowClick || (expandable && expandRender);

                return (
                  <motion.tbody
                    key={key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <tr
                      className={cn(
                        'transition-colors',
                        isClickable && 'cursor-pointer',
                        isDark
                          ? 'hover:bg-slate-800/50'
                          : 'hover:bg-slate-50'
                      )}
                      onClick={() => {
                        if (onRowClick) {
                          onRowClick(item);
                        } else if (expandable && expandRender) {
                          setExpandedRow(isExpanded ? null : key);
                        }
                      }}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            'px-4 py-3 text-sm',
                            isDark ? 'text-slate-300' : 'text-slate-600',
                            column.align === 'right' && 'text-right',
                            column.align === 'center' && 'text-center'
                          )}
                        >
                          {column.render
                            ? column.render(item, startIndex + index)
                            : String(item[column.key] ?? '-')}
                        </td>
                      ))}
                    </tr>

                    {/* Expanded Row */}
                    {expandable && expandRender && isExpanded && (
                      <tr>
                        <td colSpan={columns.length} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className={cn(
                              'p-4',
                              isDark ? 'bg-slate-800/30' : 'bg-slate-50'
                            )}
                          >
                            {expandRender(item)}
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </motion.tbody>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-t',
          isDark ? 'border-slate-700/50' : 'border-slate-200'
        )}>
          <span className={cn(
            'text-sm',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )}>
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark
                  ? 'hover:bg-slate-700 disabled:opacity-40'
                  : 'hover:bg-slate-100 disabled:opacity-40'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    currentPage === page
                      ? 'bg-blue-500 text-white'
                      : isDark
                        ? 'hover:bg-slate-700 text-slate-400'
                        : 'hover:bg-slate-100 text-slate-600'
                  )}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark
                  ? 'hover:bg-slate-700 disabled:opacity-40'
                  : 'hover:bg-slate-100 disabled:opacity-40'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;