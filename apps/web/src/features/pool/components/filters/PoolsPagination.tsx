// PoolsPagination.tsx
import styles from "../../tableau.module.css";

export function PoolsPagination({
  page,
  hasNextPage,
  onPage,
}: {
  page: number;
  hasNextPage: boolean;
  onPage: (p: number) => void;
}) {
  if (page === 1 && !hasNextPage) return null;

  return (
    <div className={styles.pagination}>
      {page > 1 && (
        <button onClick={() => onPage(page - 1)}>
          Prev
        </button>
      )}
      <span>{page}</span>
      {hasNextPage && (
        <button onClick={() => onPage(page + 1)}>
          Next
        </button>
      )}
    </div>
  );
}