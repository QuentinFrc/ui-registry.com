import { Document, Page } from "@ui-registries/pdf";
import {
  Typeset,
  TypesetBlockquote,
  TypesetCode,
  TypesetHeading,
  TypesetLink,
  TypesetList,
  TypesetListItem,
  TypesetParagraph,
  TypesetStrong,
} from "../registry/base-nova/pdf/typeset";

export default function TypesetExample() {
  return (
    <Document>
      <Page className="gap-6 bg-background p-10 text-sm" size={{ width: 420 }}>
        <Typeset>
          <TypesetHeading level={1}>Project proposal</TypesetHeading>
          <TypesetParagraph>
            Thanks for your time last week. Here is how we would approach the
            redesign of the <TypesetStrong>Maison Verdier</TypesetStrong> online
            store, based on what we discussed.
          </TypesetParagraph>
          <TypesetHeading level={2}>Approach</TypesetHeading>
          <TypesetList>
            <TypesetListItem>
              <TypesetParagraph>
                A two-day discovery workshop with your team.
              </TypesetParagraph>
            </TypesetListItem>
            <TypesetListItem>
              <TypesetParagraph>
                A design system built in Figma and shipped as{" "}
                <TypesetCode>@verdier/ui</TypesetCode>.
              </TypesetParagraph>
            </TypesetListItem>
            <TypesetListItem>
              <TypesetParagraph>
                Weekly demos, with a staging link you can share.
              </TypesetParagraph>
            </TypesetListItem>
          </TypesetList>
          <TypesetBlockquote>
            <TypesetParagraph>
              The best time to fix a checkout is before the holiday season.
            </TypesetParagraph>
          </TypesetBlockquote>
          <TypesetParagraph>
            The full quote is attached; see also our{" "}
            <TypesetLink href="https://acme.studio/terms">terms</TypesetLink>.
          </TypesetParagraph>
        </Typeset>
      </Page>
    </Document>
  );
}
