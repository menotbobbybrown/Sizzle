import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
} from "@react-email/components";

interface BookingReminderProps {
  customerName?: string;
  productName: string;
  bookingDate: string;
  bookingTime?: string;
  meetingLink?: string;
  creatorName?: string;
}

export const BookingReminderEmail = ({
  customerName,
  productName,
  bookingDate,
  bookingTime,
  meetingLink,
  creatorName = "Creator",
}: BookingReminderProps) => {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.brand}>{creatorName}</Heading>
          </Section>

          <Section style={styles.mainContent}>
            <Heading style={styles.heading}>⏰ Reminder: Your booking is coming up!</Heading>
            
            {customerName && (
              <Text style={styles.greeting}>Hi {customerName},</Text>
            )}
            
            <Text style={styles.text}>
              This is a friendly reminder that your booking for <strong>{productName}</strong> is coming up soon.
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

            {meetingLink && (
              <Section style={styles.buttonSection}>
                <Button href={meetingLink} style={styles.button}>
                  Join Meeting
                </Button>
              </Section>
            )}

            <Text style={styles.note}>
              Make sure you&apos;re in a quiet place with good internet connection. 
              Have any questions? Reply to this email.
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
    backgroundColor: "#fef3c7",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "600" as const,
    color: "#92400e",
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
    marginBottom: "24px",
    border: "1px solid #fcd34d",
  },
  detailItem: {
    fontSize: "15px",
    color: "#52525b",
    margin: "0 0 8px 0",
  },
  buttonSection: {
    textAlign: "center" as const,
    marginBottom: "16px",
  },
  button: {
    backgroundColor: "#92400e",
    color: "#ffffff",
    padding: "12px 32px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600" as const,
    textDecoration: "none",
    display: "inline-block",
  },
  note: {
    fontSize: "14px",
    color: "#78716c",
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

export default BookingReminderEmail;