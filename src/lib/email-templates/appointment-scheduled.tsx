import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'PatientTracker'

interface AppointmentScheduledProps {
  name?: string
  scheduledAt?: string
  durationMinutes?: number
  reason?: string
  notes?: string
}

const AppointmentScheduledEmail = ({
  name,
  scheduledAt,
  durationMinutes,
  reason,
  notes,
}: AppointmentScheduledProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your appointment is scheduled{scheduledAt ? ` for ${scheduledAt}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Hi ${name},` : 'Hello,'}
        </Heading>
        <Text style={lead}>
          Your care team at {SITE_NAME} has scheduled an appointment for you.
        </Text>

        <Section style={card}>
          <Text style={label}>Date & time</Text>
          <Text style={value}>{scheduledAt || 'See your patient portal'}</Text>

          {durationMinutes ? (
            <>
              <Text style={label}>Duration</Text>
              <Text style={value}>{durationMinutes} minutes</Text>
            </>
          ) : null}

          {reason ? (
            <>
              <Text style={label}>Reason</Text>
              <Text style={value}>{reason}</Text>
            </>
          ) : null}

          {notes ? (
            <>
              <Text style={label}>Notes from your care team</Text>
              <Text style={value}>{notes}</Text>
            </>
          ) : null}
        </Section>

        <Text style={text}>
          You can review your upcoming appointments anytime by signing in to your patient portal.
        </Text>
        <Text style={footer}>— The {SITE_NAME} care team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AppointmentScheduledEmail,
  subject: (data: Record<string, any>) =>
    data?.scheduledAt
      ? `Appointment scheduled for ${data.scheduledAt}`
      : 'Your appointment is scheduled',
  displayName: 'Appointment scheduled',
  previewData: {
    name: 'Jane Doe',
    scheduledAt: 'Mon, May 18, 2026 at 10:30 AM',
    durationMinutes: 30,
    reason: 'Follow-up consultation',
    notes: 'Please bring your previous lab results.',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
}
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 600,
  color: '#0f172a',
  margin: '0 0 16px',
}
const lead = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.55',
  margin: '0 0 20px',
}
const card = {
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '18px 20px',
  margin: '0 0 24px',
  backgroundColor: '#f8fafc',
}
const label = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: '#64748b',
  margin: '0 0 4px',
  fontWeight: 600,
}
const value = {
  fontSize: '15px',
  color: '#0f172a',
  margin: '0 0 14px',
  lineHeight: '1.5',
}
const text = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '24px 0 0',
}
