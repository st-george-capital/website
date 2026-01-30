import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check authentication - allow both admin users and public users for resume uploads
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';
    const isPublicUser = !session; // Public users have no session

    // If not admin and not a public user (somehow), deny access
    if (!isAdmin && !isPublicUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For public users, restrict to resume file types only
    const resumeTypes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ];
    
    if (isPublicUser && !resumeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Public users can only upload resume files (PDF, DOC, DOCX)' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, WebP, PDF, DOC, and DOCX files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for documents, 5MB for images)
    const isDocument = file.type === 'application/pdf' || 
                       file.type === 'application/msword' ||
                       file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const maxSize = isDocument ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${isDocument ? '10MB' : '5MB'}.` },
        { status: 400 }
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    let folder = 'research'; // Default for admin image uploads

    if (isPublicUser) {
      folder = 'resumes'; // Public users upload resumes
    } else if (isAdmin && isDocument) {
      folder = 'documents'; // Admin document uploads
    }

    const filename = `${folder}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    });

    // Return the blob URL
    const url = blob.url;
    
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: error.message === 'Unauthorized: Admin access required' ? 403 : 500 }
    );
  }
}

