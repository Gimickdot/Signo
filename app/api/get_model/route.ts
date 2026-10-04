import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Read model.json from local filesystem
    const modelPath = join(process.cwd(), 'app', 'fsl', 'models', 'model.json');
    const fileContents = await readFile(modelPath, 'utf-8');
    const modelJson = JSON.parse(fileContents);

    console.log("Model loaded successfully from local file");

    return NextResponse.json(modelJson);
  } catch (error) {
    console.error('Error loading model:', error);
    return NextResponse.json({ error: 'Failed to load model' }, { status: 500 });
  }
}