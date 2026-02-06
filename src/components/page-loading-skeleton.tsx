import { Skeleton } from '@/components/skeleton';

type LayoutPreset =
  | 'dashboard'
  | 'table'
  | 'cards'
  | 'form'
  | 'portfolio';

interface PageLoadingSkeletonProps {
  /** Title placeholder width */
  titleWidth?: string;
  /** Layout preset determines the skeleton structure */
  layout?: LayoutPreset;
}

export function PageLoadingSkeleton({
  titleWidth = 'w-48',
  layout = 'table',
}: PageLoadingSkeletonProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className={`h-9 ${titleWidth} rounded-lg`} />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {layout === 'dashboard' && <DashboardSkeleton />}
      {layout === 'table' && <TableSkeleton />}
      {layout === 'cards' && <CardsSkeleton />}
      {layout === 'form' && <FormSkeleton />}
      {layout === 'portfolio' && <PortfolioSkeleton />}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b">
        <Skeleton className="h-6 w-40 rounded-md" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <>
      {/* Big stats card */}
      <Skeleton className="h-48 rounded-[32px]" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="lg:col-span-4 space-y-6">
          <Skeleton className="h-80 rounded-[32px]" />
          <Skeleton className="h-64 rounded-[32px]" />
        </div>
      </div>
    </>
  );
}
