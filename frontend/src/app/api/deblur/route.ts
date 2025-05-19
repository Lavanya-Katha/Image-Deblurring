import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    const data = await request.formData();
    const image = data.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filenames
    const inputFileName = `input-${randomUUID()}.jpg`;
    const outputFileName = `output-${randomUUID()}.jpg`;

    // Define paths
    inputPath = path.join(uploadsDir, inputFileName);
    outputPath = path.join(uploadsDir, outputFileName);

    // Save the uploaded file
    const buffer = Buffer.from(await image.arrayBuffer());
    await writeFile(inputPath, buffer);

    // Run Python script with stderr suppressed
    const pythonProcess = spawn('python', [
      path.join(process.cwd(), '..', 'deblur.py'),
      inputPath,
      outputPath
    ], { stdio: ["ignore", "pipe", "ignore"] });

    return new Promise((resolve, reject) => {
      let stdoutData = '';

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
        console.log(`Python stdout: ${data}`);
      });

      pythonProcess.on('close', async (code) => {
        try {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}`);
            
            // Clean up files
            if (inputPath) await unlink(inputPath).catch(console.error);
            if (outputPath) await unlink(outputPath).catch(console.error);
            
            return resolve(NextResponse.json({
              error: 'Failed to process image'
            }, { status: 500 }));
          }

          // Ensure output file exists
          if (!existsSync(outputPath!)) {
            throw new Error('Output file was not created by the model');
          }

          // Read processed image
          const processedImage = await readFile(outputPath!);
          const base64Image = processedImage.toString('base64');

          // Clean up temp files
          await Promise.all([
            unlink(inputPath!),
            unlink(outputPath!)
          ]).catch(console.error);

          resolve(NextResponse.json({
            processedImage: base64Image,
            success: true
          }));
        } catch (error) {
          console.error('Error in Python process:', error);

          // Cleanup on error
          if (inputPath) await unlink(inputPath).catch(console.error);
          if (outputPath) await unlink(outputPath).catch(console.error);

          resolve(NextResponse.json({
            error: 'Failed to process image',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 }));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Python process error:', error);

        // Cleanup on process error
        if (inputPath) unlink(inputPath).catch(console.error);
        if (outputPath) unlink(outputPath).catch(console.error);

        resolve(NextResponse.json({
          error: 'Failed to process image',
          details: error.message
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);

    // Cleanup on unexpected error
    if (inputPath) await unlink(inputPath).catch(console.error);
    if (outputPath) await unlink(outputPath).catch(console.error);

    return NextResponse.json({
      error: 'Failed to process image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
