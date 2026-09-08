import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Button,
  Tailwind,
} from '@react-email/components';

type PasswordResetEmailProps = {
  name: string;
  resetUrl: string;
};

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-[600px] p-8">
            <Heading className="text-2xl font-bold text-gray-900">Reset Your Password</Heading>
            <Text className="mt-4 text-gray-600">
              Hi {name}, we received a request to reset the password for your Tuktak account.
            </Text>
            <Button
              className="mt-6 block w-full rounded-lg bg-[#ff6b00] px-6 py-3 text-center text-sm font-semibold text-white"
              href={resetUrl}
            >
              Reset Password
            </Button>
            <Text className="mt-4 text-sm text-gray-500">
              This link will expire in 1 hour. If you didn't request a password reset, you can
              safely ignore this email.
            </Text>
            <Text className="mt-2 text-xs text-gray-400">
              If the button doesn't work, copy and paste this URL into your browser:
            </Text>
            <Text className="text-xs text-[#ff6b00]">{resetUrl}</Text>
            <Text className="mt-8 text-xs text-gray-400">
              © {new Date().getFullYear()} Tuktak.com. All rights reserved.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
