import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { authLimiter, getClientIdentifier } from '@/lib/rate-limiter';
import { loginSchema, formatValidationErrors } from '@/lib/validation';
import { verifyUserPassword } from '@/lib/database';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for auth attempts
    const clientId = getClientIdentifier(request);
    const rateLimitResult = authLimiter.isAllowed(clientId);
    
    if (!rateLimitResult.allowed) {
      console.warn(`🚨 Rate limit exceeded for login attempt from: ${clientId}`);
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          rateLimitInfo: {
            resetTime: rateLimitResult.resetTime
          }
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Security: Log sanitized request (never log passwords)
    console.log(`Login attempt for email: ${requestBody.email || 'unknown'}`);

    // Validate with Zod schema
    const validatedData = loginSchema.parse(requestBody);
    const { email, password } = validatedData;

    // Verify user credentials using secure database
    const user = await verifyUserPassword(email, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json(
      { 
        success: true, 
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      },
      { status: 200 }
    );

    // Set cookie for browser-based requests
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          validationErrors: formatValidationErrors(error)
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}