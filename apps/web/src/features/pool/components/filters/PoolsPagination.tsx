import styles from "../../tableau.module.css";

export function PoolsPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      {page > 1 && (
        <button onClick={() => onPage(page - 1)}>
          Prev
        </button>
      )}
      <span>Page {page}</span>
      {page < totalPages && (
        <button onClick={() => onPage(page + 1)}>Next</button>
      )}
    </div>
  );
}
