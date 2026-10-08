import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ButtonLink, EmptyState } from "../components/ui";
import { TaxonomyCausalContainer, TaxonomyDomainContainer, TaxonomySubdomainContainer } from "../containers";
import {
  findCausalCategory,
  findCausalDimension,
  findDomainByNumber,
  findSubdomainByCode,
  taxonomyPaths,
} from "../utils/taxonomy";

function Page({ children }: { children: ReactNode }) {
  return <div style={{ animation: "riseIn .28s ease both" }}>{children}</div>;
}

function NotFound({ what }: { what: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <EmptyState>There is no MIT taxonomy {what} at this address.</EmptyState>
      <ButtonLink to={taxonomyPaths.index} variant="ghost">
        Browse the taxonomy
      </ButtonLink>
    </div>
  );
}

export function TaxonomyDomain() {
  const { domainNumber } = useParams<{ domainNumber: string }>();
  const domain = findDomainByNumber(domainNumber);
  return (
    <Page>
      {domain ? <TaxonomyDomainContainer key={domain.number} domain={domain} /> : <NotFound what="domain" />}
    </Page>
  );
}

export function TaxonomySubdomain() {
  const { code } = useParams<{ code: string }>();
  const match = findSubdomainByCode(code);
  return (
    <Page>
      {match ? (
        <TaxonomySubdomainContainer key={match.subdomain.code} domain={match.domain} subdomain={match.subdomain} />
      ) : (
        <NotFound what="subdomain" />
      )}
    </Page>
  );
}

export function TaxonomyCausal() {
  const { dimension, slug } = useParams<{ dimension: string; slug: string }>();
  const info = findCausalDimension(dimension);
  const category = findCausalCategory(dimension, slug);
  return (
    <Page>
      {info && category ? (
        <TaxonomyCausalContainer key={`${info.dimension}-${category.slug}`} info={info} category={category} />
      ) : (
        <NotFound what="category" />
      )}
    </Page>
  );
}
