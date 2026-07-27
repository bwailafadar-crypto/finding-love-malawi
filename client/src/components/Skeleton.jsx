export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm">
      <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="aspect-[4/5] bg-gray-200 dark:bg-gray-700" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="p-4 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    </div>
  );
}

export function SkeletonMessages() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex animate-pulse ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-2/5 bg-pink-200 dark:bg-pink-900' : 'w-2/5 bg-gray-200 dark:bg-gray-700'}`} />
        </div>
      ))}
    </div>
  );
}
