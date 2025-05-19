import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { rating, comment } = await req.json();

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Invalid rating' },
        { status: 400 }
      );
    }

    // Here you would typically store the feedback in a database
    // For now, we'll just log it
    console.log('Received feedback:', { rating, comment });

    return NextResponse.json({
      success: true,
      message: 'Feedback received successfully'
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
} 