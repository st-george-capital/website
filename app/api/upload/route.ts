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

    // Check authentication
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';
    const isNonAdminUser = !!session && !isAdmin; // logged-in but not admin
    const isPublicUser = !session;

    // Non-admin logged-in users and public users can only upload resumes
    const resumeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if ((isPublicUser || isNonAdminUser) && !resumeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, DOC, and DOCX resume files are accepted.' },
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

    // Validate file size (max 4MB for resumes/documents, 5MB for images)
    const isDocument = file.type === 'application/pdf' ||
                       file.type === 'application/msword' ||
                       file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const maxSize = isDocument ? 4 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: `File too large (${sizeMB}MB). Maximum size is ${isDocument ? '4MB' : '5MB'}. Try compressing your PDF at smallpdf.com or reducing image quality when exporting.` },
        { status: 400 }
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    let folder = 'research'; // Default for admin image uploads

    if (isPublicUser || isNonAdminUser) {
      folder = 'resumes'; // Public and non-admin users upload resumes
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

