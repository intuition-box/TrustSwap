import PortfolioFeature from "../features/portfolio";

export default function PortfolioPageWrapper() {
  return (
    <section>
      <div className="rounded-2xl border border-white/10 p-4">
        <PortfolioFeature />
      </div>
    </section>
  );
}
