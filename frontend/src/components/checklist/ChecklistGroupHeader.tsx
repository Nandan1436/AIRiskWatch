import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { MitDomain } from "../../constants/mitTaxonomy";
import { Dot } from "../ui";
import { domainColor, taxonomyPaths } from "../../utils/taxonomy";
import styles from "./Checklist.module.css";

export function ChecklistGroupHeader({ domain }: { domain: MitDomain }) {
  return (
    <div className={styles.groupHead}>
      <Dot color={domainColor(domain)} />
      {domain.name}
      <Link to={taxonomyPaths.domain(domain.number)}>
        About this domain <ArrowRight />
      </Link>
    </div>
  );
}
