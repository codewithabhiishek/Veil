export function VaultSkeleton() {
  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--color-surface-0)' }}>
      {/* Sidebar Skeleton */}
      <div className="w-60 flex-shrink-0 p-4 space-y-4 border-r" style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-surface-1)' }}>
        <div className="flex items-center gap-2">
          <div className="skeleton w-6 h-6 rounded-md" />
          <div className="skeleton h-4 w-20" />
        </div>
        
        <div className="space-y-2 pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
              <div className="skeleton w-4 h-4 rounded" />
              <div className="skeleton h-3.5 w-24" />
            </div>
          ))}
        </div>

        <div className="pt-6">
          <div className="skeleton h-3 w-16 mb-3" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5 pl-7">
                <div className="skeleton w-3.5 h-3.5 rounded" />
                <div className="skeleton h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Entry List Skeleton */}
      <div className="w-80 flex-shrink-0 border-r p-4 space-y-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="skeleton h-3 w-20" />
        </div>

        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
            <div className="skeleton w-9 h-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-32" />
              <div className="skeleton h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Detail Skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="skeleton w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-3 w-24" />
          </div>
        </div>

        <div className="space-y-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UnlockSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-surface-0)' }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="skeleton w-14 h-14 rounded-xl mx-auto" />
          <div className="skeleton h-5 w-40 mx-auto" />
          <div className="skeleton h-3.5 w-56 mx-auto" />
        </div>

        <div className="space-y-4">
          <div className="skeleton h-11 w-full rounded-lg" />
          <div className="skeleton h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function EntryListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg stagger-item">
          <div className="skeleton w-9 h-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-32" />
            <div className="skeleton h-2.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
