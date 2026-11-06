import { Resume } from "../registry/base-nova/pdf/resume";
import { exampleResume } from "../registry/base-nova/pdf/resume-example";

export default function ResumeExample() {
  return <Resume data={exampleResume} />;
}
