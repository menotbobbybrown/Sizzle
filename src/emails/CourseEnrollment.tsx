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

interface CourseEnrollmentProps {
  customerName?: string;
  courseName: string;
  courseUrl: string;
  moduleCount?: number;
  creatorName?: string;
}

export const CourseEnrollmentEmail = ({
  customerName,
  courseName,
  courseUrl,
  moduleCount,
  creatorName = "Creator",
}: CourseEnrollmentProps) => {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.brand}>{creatorName}</Heading>
          </Section>

          <Section style={styles.mainContent}>
            <Heading style={styles.heading}>You&apos;re enrolled! 🎓</Heading>
            
            {customerName && (
              <Text style={styles.greeting}>Hi {customerName},</Text>
            )}
            
            <Text style={styles.text}>
              Welcome to <strong>{courseName}</strong>! Your access has been granted. 
              {moduleCount && ` This course has ${moduleCount} modules to explore.`}
            </Text>

            <Section style={styles.buttonSection}>
              <Button href={courseUrl} style={styles.button}>
                Start Learning
              </Button>
            </Section>

            <Text style={styles.tip}>
              💡 Tip: Create a study schedule to get the most out of your course. 
              Set aside dedicated time each week to watch videos and complete lessons.
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
  tip: {
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

export default CourseEnrollmentEmail;