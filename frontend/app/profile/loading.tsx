import styles from "./ProfilePage.module.css";

export default function ProfileLoading() {
  return (
    <main className={styles.loadingPage} aria-label="Loading profile">
      <div className={styles.loadingHeader} />
      <div className={styles.loadingGrid}>
        <div className={styles.loadingAside} />
        <div className={styles.loadingContent} />
      </div>
    </main>
  );
}
