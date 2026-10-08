import { PageHead } from "../components/layout";
import { TaxonomyContainer } from "../containers";

export function Taxonomy() {
  return (
    <div style={{ animation: "riseIn .28s ease both" }}>
      <PageHead
        crumbs={[{ label: "Home", to: "/" }, { label: "Taxonomy" }]}
        eyebrow="Taxonomy reference"
        title="How AIRiskWatch classifies AI risk"
        description={
          <>
            Every incident is tagged with taxonomies from the MIT AI Risk Repository. Pick any category to read what
            it means and see its incidents and statistics. Methodology:{" "}
            <a
              href="https://airisk.mit.edu/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-data"
            >
              Slattery et al. (2024)
            </a>
            .
          </>
        }
      />
      <TaxonomyContainer />
    </div>
  );
}
