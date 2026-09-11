import styles from "./table.module.css";

export default function LoadingTable() {
  return <main className={styles.page}><div className={styles.empty} role="status">Loading movies...</div></main>;
}
