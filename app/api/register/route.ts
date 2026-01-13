import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_CODE = process.env.ADMIN_CODE || 'stgeorge2025';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, adminCode } = await request.json();

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be user or admin' },
        { status: 400 }
      );
    }

    // Check admin code if role is admin
    if (role === 'admin' && adminCode !== ADMIN_CODE) {
      return NextResponse.json(
        { error: 'Invalid admin code' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token
    const emailToken = crypto.randomBytes(32).toString('hex');
    const emailTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        emailToken,
        emailTokenExpiry,
      },
    });

    // Send verification email
    try {
      await resend.emails.send({
        from: 'SGC <noreply@stgeorgecapital.ca>',
        to: email,
        subject: 'Verify your SGC account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #030116;">Welcome to St. George Capital</h1>
            <p>Hi ${name},</p>
            <p>Thank you for registering for a St. George Capital account. Please verify your email address by clicking the link below:</p>
            <a href="${process.env.NEXTAUTH_URL}/verify-email?token=${emailToken}"
               style="background-color: #030116; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
              Verify Email
            </a>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <br>
            <p>Best regards,<br>The St. George Capital Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, but log it
    }

    return NextResponse.json({
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
