import PoolsFeature from "../features/pool";

export default function PoolsPage() {
  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Pools</h1>

      <div className="rounded-2xl border border-white/10 p-4">
        <PoolsFeature />
      </div>
    </section>
  );
}
