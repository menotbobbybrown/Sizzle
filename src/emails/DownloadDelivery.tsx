import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Link,
} from "@react-email/components";

interface DownloadDeliveryProps {
  customerName?: string;
  productName: string;
  downloadUrl: string;
  expiresAt?: string;
  creatorName?: string;
}

export const DownloadDeliveryEmail = ({
  customerName,
  productName,
  downloadUrl,
  expiresAt,
  creatorName = "Creator",
}: DownloadDeliveryProps) => {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.brand}>{creatorName}</Heading>
          </Section>

          <Section style={styles.mainContent}>
            <Heading style={styles.heading}>Your download is ready! 📦</Heading>
            
            {customerName && (
              <Text style={styles.greeting}>Hi {customerName},</Text>
            )}
            
            <Text style={styles.text}>
              Your download for <strong>{productName}</strong> is ready. Click the button below to download your files.
            </Text>

            <Section style={styles.buttonSection}>
              <Button href={downloadUrl} style={styles.button}>
                Download Now
              </Button>
            </Section>

            {expiresAt && (
              <Text style={styles.expiry}>
                This download link expires on {expiresAt}. Make sure to save your files before then.
              </Text>
            )}

            <Text style={styles.helpText}>
              Having trouble? Reply to this email and we&apos;ll help you out.
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} {creatorName} • Powered by Sizzle
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const styles = {
  body: {
    backgroundColor: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "24px",
    maxWidth: "600px",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "24px",
  },
  brand: {
    fontSize: "20px",
    fontWeight: "600" as const,
    color: "#18181b",
    margin: "0",
  },
  mainContent: {
    backgroundColor: "#fafafa",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "600" as const,
    color: "#18181b",
    margin: "0 0 16px 0",
    textAlign: "center" as const,
  },
  greeting: {
    fontSize: "16px",
    color: "#52525b",
    margin: "0 0 16px 0",
  },
  text: {
    fontSize: "15px",
    color: "#52525b",
    margin: "0 0 24px 0",
    lineHeight: 1.5 as const,
  },
  buttonSection: {
    textAlign: "center" as const,
    marginBottom: "16px",
  },
  button: {
    backgroundColor: "#18181b",
    color: "#ffffff",
    padding: "12px 32px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600" as const,
    textDecoration: "none",
    display: "inline-block",
  },
  expiry: {
    fontSize: "13px",
    color: "#f59e0b",
    margin: "0 0 16px 0",
    textAlign: "center" as const,
  },
  helpText: {
    fontSize: "14px",
    color: "#71717a",
    margin: "0",
    textAlign: "center" as const,
  },
  footer: {
    textAlign: "center" as const,
    marginTop: "24px",
  },
  footerText: {
    fontSize: "12px",
    color: "#a1a1aa",
    margin: "0",
  },
};

export default DownloadDeliveryEmail;