import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="text-center grid gap-3">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="opacity-80">Page introuvable.</p>
      <Link to="/swap" className="underline">Retour au Swap</Link>
    </div>
  );
}
