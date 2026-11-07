import { join } from "node:path";
import { Block, Document, Page } from "@ui-registries/pdf";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "../registry/base-nova/pdf/avatar";

// Local images only: previews are rendered offline (scripts and tests).
const asset = (file: string) => join(import.meta.dirname, "..", "assets", file);

const people = [
  { name: "Alice Martin", initials: "AM", image: asset("avatar-1.png") },
  { name: "Bruno Petit", initials: "BP", image: asset("avatar-2.png") },
  { name: "Chloé Bernard", initials: "CB", image: asset("avatar-3.png") },
  { name: "David Roux", initials: "DR" },
];

export default function AvatarExample() {
  return (
    <Document>
      <Page className="gap-6 bg-background p-10 text-sm" size={{ width: 420 }}>
        <Block className="flex-row items-center gap-4">
          <Avatar size="sm">
            <AvatarFallback>AM</AvatarFallback>
            <AvatarImage src={asset("avatar-1.png")} />
          </Avatar>
          <Avatar>
            <AvatarFallback>AM</AvatarFallback>
            <AvatarImage src={asset("avatar-1.png")} />
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>AM</AvatarFallback>
            <AvatarImage src={asset("avatar-1.png")} />
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>DR</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>DR</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>DR</AvatarFallback>
          </Avatar>
        </Block>
        <AvatarGroup>
          {people.map((person) => (
            <Avatar key={person.name} size="lg">
              <AvatarFallback>{person.initials}</AvatarFallback>
              {person.image ? <AvatarImage src={person.image} /> : null}
            </Avatar>
          ))}
          <Avatar size="lg">
            <AvatarFallback>+3</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      </Page>
    </Document>
  );
}
