import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
} from "@react-email/components";

interface WelcomeSubscriberProps {
  subscriberName?: string;
  creatorName?: string;
  storefrontUrl?: string;
}

export const WelcomeSubscriberEmail = ({
  subscriberName,
  creatorName = "Creator",
  storefrontUrl,
}: WelcomeSubscriberProps) => {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.brand}>{creatorName}</Heading>
          </Section>

          <Section style={styles.mainContent}>
            <Heading style={styles.heading}>You&apos;re in! 🎉</Heading>
            
            {subscriberName ? (
              <Text style={styles.greeting}>Hi {subscriberName},</Text>
            ) : (
              <Text style={styles.greeting}>Hi there,</Text>
            )}
            
            <Text style={styles.text}>
              Thanks for subscribing! You&apos;ll be the first to know about new products, exclusive offers, and behind-the-scenes updates.
            </Text>

            {storefrontUrl && (
              <Text style={styles.text}>
                In the meantime, check out what&apos;s available right now:
              </Text>
            )}

            {storefrontUrl && (
              <Link href={storefrontUrl} style={styles.link}>
                Visit {creatorName}&apos;s Store →
              </Link>
            )}

            <Text style={styles.unsubscribe}>
              Not interested? You can{" "}
              <Link href="{{{unsubscribeUrl}}}" style={styles.unsubscribeLink}>
                unsubscribe
              </Link>{" "}
              at any time.
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
    margin: "0 0 16px 0",
    lineHeight: 1.5 as const,
  },
  link: {
    fontSize: "15px",
    color: "#2563eb",
    textDecoration: "none",
    display: "inline-block",
    marginBottom: "16px",
  },
  unsubscribe: {
    fontSize: "12px",
    color: "#a1a1aa",
    margin: "24px 0 0 0",
  },
  unsubscribeLink: {
    color: "#71717a",
    textDecoration: "underline",
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

export default WelcomeSubscriberEmail;