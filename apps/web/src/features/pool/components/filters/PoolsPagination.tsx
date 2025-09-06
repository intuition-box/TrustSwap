// apps/web/src/features/pools/components/filters/PoolsPagination.tsx
export function PoolsPagination({ page, onPage }:{ page:number; onPage:(p:number)=>void }){
return (
<div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
<button onClick={()=>onPage(Math.max(1,page-1))}>Prev</button>
<span>Page {page}</span>
<button onClick={()=>onPage(page+1)}>Next</button>
</div>
);
}