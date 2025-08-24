import { useMemo, useState } from 'react'
import type { Address } from 'viem'
import { TOKENS, type Currency } from '../tokens/intuit'


export default function TokenSelect({ value, onChange }: {
value: Currency
onChange: (t: Currency) => void
}) {
const [q, setQ] = useState('')
const items = useMemo(() => {
const s = q.trim().toLowerCase()
if (!s) return TOKENS
return TOKENS.filter(t =>
t.symbol.toLowerCase().includes(s) ||
t.name.toLowerCase().includes(s) ||
(t.address && (t.address as Address).toLowerCase() === s)
)
}, [q])


return (
<div className="flex items-center gap-2">
<input
className="border rounded px-2 py-1 text-sm"
placeholder="Search symbol, name or 0x..."
value={q}
onChange={e=>setQ(e.target.value)}
style={{width:220}}
/>
<select
className="border rounded px-2 py-1"
value={value.symbol}
onChange={e=>{
const t = TOKENS.find(x=>x.symbol===e.target.value)!
onChange(t)
}}
>
{items.map(t => (
<option key={t.symbol} value={t.symbol}>
{t.symbol}
</option>
))}
</select>
</div>
)
}