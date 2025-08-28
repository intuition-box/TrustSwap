// src/pages/AdminProtocol.tsx
import ProtocolFeeCard from "./admin/ProtocolFeeCard"

export default function AdminProtocol() {
  return (
    <div className="max-w-xl mx-auto mt-8">
      <h1 className="text-xl font-semibold mb-4">Protocol Fee</h1>
      <ProtocolFeeCard />
      <p className="text-sm opacity-70 mt-4">
        When ON: traders still pay 0.30%. Protocol gets ~0.05% (via LP minted to treasury on next mint/burn), LPs ~0.25%.
      </p>
    </div>
  )
}
