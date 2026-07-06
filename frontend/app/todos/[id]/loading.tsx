import styles from "./TodoDetail.module.css";

export default function TodoDetailLoading() {
  return (
    <div className="site-shell">
      <div className={styles.loadingNavbar} />
      <main className={`${styles.detailMain} ${styles.loadingMain}`} aria-label="Loading task details">
        <div className={`${styles.skeleton} ${styles.loadingBack}`} />
        <div className={`${styles.skeleton} ${styles.loadingTitle}`} />
        <div className={`${styles.skeleton} ${styles.loadingPanel}`} />
      </main>
    </div>
  );
}
