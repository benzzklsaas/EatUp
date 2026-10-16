// Squelettes de chargement : reprennent la géométrie exacte des écrans pour éviter tout saut de mise en page.

export function MenuSkeleton() {
  return (
    <div className="eu-app" aria-busy="true" aria-label="Chargement du menu">
      <div className="relative h-[220px] bg-ink/90 sm:h-[320px]">
        <div className="absolute top-[14px] left-4 h-7 w-16 rounded-full bg-white/10" />
      </div>
      <div className="mx-auto max-w-3xl px-4">
        <div className="-mt-16 rounded-[30px] bg-white p-5 shadow-[var(--eu-shadow-float)] sm:p-7">
          <div className="flex items-start gap-4">
            <div className="eu-skeleton -mt-12 size-[88px] rounded-[24px] ring-[5px] ring-white sm:-mt-14 sm:size-[104px]" />
            <div className="eu-skeleton mt-1 h-7 w-36 rounded-full" />
          </div>
          <div className="eu-skeleton mt-4 h-8 w-3/4" />
          <div className="eu-skeleton mt-3 h-4 w-full" />
          <div className="eu-skeleton mt-2 h-4 w-2/3" />
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="eu-skeleton h-[68px] rounded-2xl" />
            <div className="eu-skeleton h-[68px] rounded-2xl" />
          </div>
        </div>
      </div>
      <div className="mt-6 border-b border-line">
        <div className="mx-auto flex h-[60px] max-w-3xl items-center gap-2 overflow-hidden px-3">
          {[84, 110, 72, 96, 120].map((w, i) => <div key={i} className="eu-skeleton h-10 shrink-0 rounded-full" style={{ width: w }} />)}
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 pt-5">
        <div className="eu-skeleton mb-4 h-7 w-40" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => <ProductRowSkeleton key={i} />)}
        </div>
      </div>
    </div>
  )
}

export function ProductRowSkeleton() {
  return (
    <div className="flex gap-4 rounded-[22px] bg-white p-3.5 shadow-[var(--eu-shadow-card)]">
      <div className="flex flex-1 flex-col gap-2 py-1">
        <div className="eu-skeleton h-5 w-2/3" />
        <div className="eu-skeleton h-3.5 w-full" />
        <div className="eu-skeleton h-3.5 w-4/5" />
        <div className="eu-skeleton mt-auto h-5 w-16" />
      </div>
      <div className="eu-skeleton size-[112px] shrink-0 rounded-[18px] sm:size-[124px]" />
    </div>
  )
}

export function CheckoutSkeleton() {
  return (
    <div className="eu-app" aria-busy="true" aria-label="Chargement">
      <div className="h-16 border-b border-line" />
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-5">
        <div className="eu-skeleton h-24 rounded-[24px]" />
        <div className="eu-skeleton h-56 rounded-[24px]" />
        <div className="eu-skeleton h-64 rounded-[24px]" />
      </div>
    </div>
  )
}
