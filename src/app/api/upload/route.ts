
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadType = formData.get('type') as 'post' | 'avatar' | null; // 'post' or 'avatar'

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!uploadType) {
      return NextResponse.json({ error: 'Upload type (post/avatar) not specified.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    
    let relativeUploadDir = '';
    if (uploadType === 'post') {
      relativeUploadDir = 'post_contents';
    } else if (uploadType === 'avatar') {
      relativeUploadDir = 'avatars';
    } else {
      return NextResponse.json({ error: 'Invalid upload type.' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', relativeUploadDir);
    const filePath = path.join(uploadDir, uniqueFilename);

    // Ensure the upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write the file to the public directory
    await writeFile(filePath, buffer);

    const publicUrl = `/${relativeUploadDir}/${uniqueFilename}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file.', details: (error as Error).message }, { status: 500 });
  }
}
