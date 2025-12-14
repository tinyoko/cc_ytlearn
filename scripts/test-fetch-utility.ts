
import { getTranscript } from '../src/lib/transcript';

async function main() {
    const videoId = 'zWU4wnKi62M'; // Utility Model
    console.log(`Testing transcript fetch for ${videoId}...`);
    try {
        const segments = await getTranscript(videoId);
        console.log(`Fetched ${segments.length} segments.`);
        if (segments.length > 0) {
            console.log('First segment:', segments[0]);
        } else {
            console.log('No segments found.');
        }
    } catch (error) {
        console.error('Error fetching transcript:', error);
    }
}

main();
