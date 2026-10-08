import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { MIT_CAUSAL, type CausalDimension } from "../../constants/mitTaxonomy";
import type { IncidentClassification } from "../../interfaces";
import { causalIcon } from "../taxonomy";
import { Dot } from "../ui";
import {
  CAUSAL_PARAM,
  domainColor,
  findCausalCategory,
  findDomainByName,
  findSubdomainByName,
  taxonomyPaths,
} from "../../utils/taxonomy";
import styles from "./ClassificationSidebar.module.css";

// Short labels so all three causal values fit side by side.
const SHORT_LABELS: Record<string, string> = {
  "intent:intentional": "Intended",
  "intent:unintentional": "Unintended",
  "timing:pre-deployment": "Pre",
  "timing:post-deployment": "Post",
};

export function ClassificationSidebar({ classifications }: { classifications: IncidentClassification[] }) {
  if (classifications.length === 0) {
    return (
      <aside className={styles.side}>
        <h4>MIT classification</h4>
        <p className={styles.none}>This incident has not been classified yet.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.side}>
      {classifications.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <hr className={styles.divider} />}
          <ClassificationBlock classification={c} index={classifications.length > 1 ? i + 1 : null} />
        </Fragment>
      ))}
    </aside>
  );
}

function ClassificationBlock({
  classification,
  index,
}: {
  classification: IncidentClassification;
  index: number | null;
}) {
  const domain = findDomainByName(classification.risk_domain);
  const sub = findSubdomainByName(classification.risk_subdomain)?.subdomain;

  return (
    <>
      <h4>MIT classification{index ? ` ${index}` : ""}</h4>
      {domain ? (
        <Link to={taxonomyPaths.domain(domain.number)} className={styles.cls}>
          <div className={styles.key}>
            Domain <ArrowUpRight />
          </div>
          <div className={styles.value}>
            <Dot color={domainColor(domain)} />
            {domain.number} · {domain.name}
          </div>
        </Link>
      ) : (
        classification.risk_domain && <StaticBlock label="Domain" value={classification.risk_domain} />
      )}
      {sub ? (
        <Link to={taxonomyPaths.subdomain(sub.code)} className={styles.cls}>
          <div className={styles.key}>
            Subdomain <ArrowUpRight />
          </div>
          <div className={styles.value}>
            {sub.code} · {sub.name}
          </div>
        </Link>
      ) : (
        classification.risk_subdomain && <StaticBlock label="Subdomain" value={classification.risk_subdomain} />
      )}

      <h4 className={styles.causalHead}>Causal taxonomy</h4>
      <div className={styles.causal3}>
        {MIT_CAUSAL.map(({ dimension, label }) => (
          <CausalBlock
            key={dimension}
            dimension={dimension}
            label={label}
            value={classification[CAUSAL_PARAM[dimension]]}
          />
        ))}
      </div>
    </>
  );
}

function CausalBlock({ dimension, label, value }: { dimension: CausalDimension; label: string; value: string | null }) {
  const category = findCausalCategory(dimension, value);
  if (!category) {
    return <StaticBlock label={label} value={value ?? "—"} />;
  }
  const Icon = causalIcon(dimension, category.slug);
  return (
    <Link to={taxonomyPaths.causal(dimension, category.slug)} className={styles.cls} title={category.definition}>
      <div className={styles.key}>{label}</div>
      <div className={styles.value}>
        <Icon />
        {SHORT_LABELS[`${dimension}:${category.slug}`] ?? category.name}
      </div>
    </Link>
  );
}

function StaticBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.clsStatic}>
      <div className={styles.key}>{label}</div>
      <div className={styles.value}>{value}</div>
    </div>
  );
}
