const block = "animate-pulse rounded-md bg-panel";

/** Appears the moment a link is clicked, so the app never feels stuck. */
export default function DashboardLoading() {
  return (
    <div aria-busy className="mx-auto max-w-5xl space-y-6">
      <div className={`${block} h-10 w-64`} />
      <div className={`${block} h-5 w-96 max-w-full`} />
      <div className="grid gap-4 pt-4 sm:grid-cols-3">
        <div className={`${block} h-28`} />
        <div className={`${block} h-28`} />
        <div className={`${block} h-28`} />
      </div>
      <div className={`${block} h-64`} />
    </div>
  );
}
