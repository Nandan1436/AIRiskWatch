import styles from "./OverviewHero.module.css";

export function OverviewHero({ totalIncidents }: { totalIncidents?: number }) {
  return (
    <section className={styles.hero}>
      <div className={styles.live}>
        <span className={styles.liveDot} /> Live · news ingested daily
      </div>
      <h1>
        Tracking real-world <span>AI harms</span>,<br />
        classified by risk.
      </h1>
      <p>
        {totalIncidents ? `${totalIncidents.toLocaleString()} incidents` : "Incidents"} from the MIT AI Risk
        Repository and daily news, mapped to the MIT domain and causal taxonomies.
      </p>
    </section>
  );
}
