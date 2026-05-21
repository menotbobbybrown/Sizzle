import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    border: '10pt solid #18181b',
  },
  title: {
    fontSize: 40,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 40,
  },
  name: {
    fontSize: 32,
    marginBottom: 20,
    textDecoration: 'underline',
  },
  course: {
    fontSize: 24,
    marginBottom: 40,
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    marginTop: 40,
    color: '#71717a',
  },
});

export const CertificateTemplate = ({ 
  userName, 
  courseName, 
  workspaceName, 
  date 
}: { 
  userName: string; 
  courseName: string; 
  workspaceName: string; 
  date: string;
}) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Text style={styles.title}>CERTIFICATE OF COMPLETION</Text>
      <Text style={styles.subtitle}>This is to certify that</Text>
      <Text style={styles.name}>{userName}</Text>
      <Text style={styles.subtitle}>has successfully completed the course</Text>
      <Text style={styles.course}>{courseName}</Text>
      <Text style={styles.footer}>Issued by {workspaceName} on {date}</Text>
    </Page>
  </Document>
);
