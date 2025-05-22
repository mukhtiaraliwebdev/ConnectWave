
import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { filePath: publicFilePath } = await request.json(); // e.g., /post_contents/image.png

    if (!publicFilePath || typeof publicFilePath !== 'string') {
      return NextResponse.json({ error: 'File path not provided or invalid.' }, { status: 400 });
    }

    // Construct the absolute path on the server
    // Ensure publicFilePath starts with a / and is a relative path from public
    const serverFilePath = path.join(process.cwd(), 'public', publicFilePath.startsWith('/') ? publicFilePath.substring(1) : publicFilePath);
    
    // Basic security: check if the path is trying to go outside 'public'
    const publicDir = path.join(process.cwd(), 'public');
    if (!serverFilePath.startsWith(publicDir)) {
        return NextResponse.json({ error: 'Invalid file path.' }, { status: 400 });
    }

    try {
      await unlink(serverFilePath);
      return NextResponse.json({ success: true, message: 'File deleted successfully.' });
    } catch (unlinkError: any) {
      if (unlinkError.code === 'ENOENT') {
        // File not found, maybe already deleted. Consider this a success or log it.
        console.warn('Attempted to delete non-existent file:', serverFilePath);
        return NextResponse.json({ success: true, message: 'File not found, considered deleted.' });
      }
      console.error('Error deleting file:', unlinkError);
      return NextResponse.json({ error: 'Failed to delete file.', details: unlinkError.message }, { status: 500 });
    }

  } catch (error) {
    console.error('Delete media API error:', error);
    return NextResponse.json({ error: 'Internal server error.', details: (error as Error).message }, { status: 500 });
  }
}
