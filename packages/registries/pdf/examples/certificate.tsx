import { Certificate } from "../registry/base-nova/pdf/certificate";
import { exampleCertificate } from "../registry/base-nova/pdf/certificate-example";

export default function CertificateExample() {
  return <Certificate data={exampleCertificate} />;
}
