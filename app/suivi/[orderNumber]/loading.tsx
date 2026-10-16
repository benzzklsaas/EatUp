export default function Loading() {
  return (
    <div className="eu-app" aria-busy="true" aria-label="Chargement du suivi">
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-[68px]">
        <div className="eu-skeleton h-[330px] rounded-[30px]" />
        <div className="eu-skeleton h-[240px] rounded-[24px]" />
        <div className="eu-skeleton h-[160px] rounded-[24px]" />
      </div>
    </div>
  )
}
