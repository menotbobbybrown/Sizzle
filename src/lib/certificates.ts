import React from 'react';
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { uploadBufferToR2 } from "@/lib/r2";
import { CertificateTemplate } from "@/components/certificates/certificate-template";

export async function generateCertificate(enrollmentId: string) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: true,
      product: { include: { workspace: true } },
    },
  });

  if (!enrollment || !enrollment.user) return null;

  const pdfBuffer = await renderToBuffer(
    React.createElement(CertificateTemplate, {
      userName: enrollment.user.name || "Student",
      courseName: enrollment.product.name,
      workspaceName: enrollment.product.workspace.name,
      date: new Date().toLocaleDateString(),
    })
  );

  const key = `certificates/${enrollmentId}.pdf`;
  const url = await uploadBufferToR2(key, pdfBuffer as Buffer, "application/pdf");

  await db.enrollment.update({
    where: { id: enrollmentId },
    data: {
      certificateUrl: url,
      completedAt: new Date(),
      status: "COMPLETED",
    },
  });

  return url;
}
