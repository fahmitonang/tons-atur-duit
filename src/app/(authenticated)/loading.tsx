export default function AuthenticatedLoading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Contextual Sub-header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-7 w-28 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>

      {/* Hero Card Skeleton */}
      <div className="h-44 w-full bg-gray-200 dark:bg-gray-800 rounded-3xl" />

      {/* Secondary Insight Card Skeleton */}
      <div className="h-24 w-full bg-gray-100 dark:bg-gray-800/70 rounded-2xl border border-gray-200/60 dark:border-gray-700/50" />

      {/* Two Column Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 bg-gray-100 dark:bg-gray-800/70 rounded-2xl" />
        <div className="h-20 bg-gray-100 dark:bg-gray-800/70 rounded-2xl" />
      </div>

      {/* Main Content Block Skeleton */}
      <div className="h-64 w-full bg-gray-100 dark:bg-gray-800/70 rounded-2xl" />
    </div>
  );
}
