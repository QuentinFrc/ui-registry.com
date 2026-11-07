import { Report } from "../registry/base-nova/pdf/report";
import { exampleReport } from "../registry/base-nova/pdf/report-example";

export default function ReportExample() {
  return <Report data={exampleReport} />;
}
