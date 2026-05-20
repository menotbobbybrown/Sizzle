import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Section,
  Text,
  Button,
  Row,
  Column,
} from "@react-email/components";

interface PurchaseConfirmationProps {
  customerName?: string;
  productName: string;
  productImage?: string;
  amount: string;
  currency: string;
  orderId: string;
  accessUrl?: string;
  creatorName?: string;
  creatorLogo?: string;
}

export const PurchaseConfirmationEmail = ({
  customerName,
  productName,
  productImage,
  amount,
  currency,
  orderId,
  accessUrl,
  creatorName = "Creator",
  creatorLogo,
}: PurchaseConfirmationProps) => {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            {creatorLogo ? (
              <Img src={creatorLogo} width={40} height={40} alt={creatorName} style={styles.logo} />
            ) : (
              <Heading style={styles.brand}>{creatorName}</Heading>
            )}
          </Section>

          {/* Main Content */}
          <Section style={styles.mainContent}>
            <Heading style={styles.heading}>Thank you for your purchase! 🎉</Heading>
            
            {customerName && (
              <Text style={styles.greeting}>Hi {customerName},</Text>
            )}
            
            <Text style={styles.text}>
              Your order has been confirmed. Here&apos;s a summary:
            </Text>

            {/* Order Summary */}
            <Section style={styles.orderBox}>
              <Row>
                <Column style={{ width: "80%" }}>
                  <Text style={styles.productName}>{productName}</Text>
                </Column>
                <Column style={{ width: "20%", textAlign: "right" }}>
                  <Text style={styles.price}>{currency}{amount}</Text>
                </Column>
              </Row>
              <Text style={styles.orderId}>Order ID: {orderId}</Text>
            </Section>

            {accessUrl && (
              <Section style={styles.buttonSection}>
                <Button href={accessUrl} style={styles.button}>
                  Access Your Purchase
                </Button>
              </Section>
            )}

            <Text style={styles.helpText}>
              If you have any questions about your purchase, please reply to this email.
            </Text>
          </Section>

          {/* Footer */}
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
  logo: {
    borderRadius: "8px",
    margin: "0 auto",
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
  orderBox: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "24px",
    border: "1px solid #e4e4e7",
  },
  productName: {
    fontSize: "16px",
    fontWeight: "500" as const,
    color: "#18181b",
    margin: "0 0 4px 0",
  },
  price: {
    fontSize: "16px",
    fontWeight: "600" as const,
    color: "#18181b",
    margin: "0",
  },
  orderId: {
    fontSize: "12px",
    color: "#71717a",
    margin: "8px 0 0 0",
  },
  buttonSection: {
    textAlign: "center" as const,
    marginBottom: "16px",
  },
  button: {
    backgroundColor: "#18181b",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "500" as const,
    textDecoration: "none",
    display: "inline-block",
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

export default PurchaseConfirmationEmail;