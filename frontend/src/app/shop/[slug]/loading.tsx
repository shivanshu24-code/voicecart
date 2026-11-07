const block = "animate-pulse rounded-md bg-panel";

export default function ShopLoading() {
  return (
    <div aria-busy className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className={`${block} h-12`} />
      <div className={`${block} h-64`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={`${block} aspect-square`} />
        <div className={`${block} aspect-square`} />
        <div className={`${block} aspect-square`} />
        <div className={`${block} aspect-square`} />
      </div>
    </div>
  );
}
