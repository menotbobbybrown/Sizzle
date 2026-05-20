import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
} from "@react-email/components";

interface BookingConfirmationProps {
  customerName?: string;
  productName: string;
  bookingDate: string;
  bookingTime?: string;
  creatorName?: string;
  creatorEmail?: string;
}

export const BookingConfirmationEmail = ({
  customerName,
  productName,
  bookingDate,
  bookingTime,
  creatorName = "Creator",
  creatorEmail,
}: BookingConfirmationProps) => {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.brand}>{creatorName}</Heading>
          </Section>

          <Section style={styles.mainContent}>
            <Heading style={styles.heading}>Booking Confirmed ✓</Heading>
            
            {customerName && (
              <Text style={styles.greeting}>Hi {customerName},</Text>
            )}
            
            <Text style={styles.text}>
              Your booking for <strong>{productName}</strong> has been confirmed.
            </Text>

            <Section style={styles.detailsBox}>
              <Text style={styles.detailItem}>
                📅 Date: <strong>{bookingDate}</strong>
              </Text>
              {bookingTime && (
                <Text style={styles.detailItem}>
                  🕐 Time: <strong>{bookingTime}</strong>
                </Text>
              )}
            </Section>

            <Text style={styles.reminder}>
              💡 Please show up on time. If you need to reschedule, reply to this email at least 24 hours before your appointment.
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
    color: "#16a34a",
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
  detailsBox: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
    border: "1px solid #e4e4e7",
  },
  detailItem: {
    fontSize: "15px",
    color: "#52525b",
    margin: "0 0 8px 0",
  },
  reminder: {
    fontSize: "14px",
    color: "#3b82f6",
    margin: "0",
    lineHeight: 1.5 as const,
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

export default BookingConfirmationEmail;