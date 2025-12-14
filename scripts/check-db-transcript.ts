
import { prisma } from '../src/lib/prisma';

async function main() {
    const videoId = 'zWU4wnKi62M'; // Utility Model
    console.log(`Checking DB for videoId: ${videoId}`);

    const video = await prisma.video.findFirst({
        where: { videoId },
        include: { transcript: true }
    });

    if (!video) {
        console.log('Video not found in DB');
        return;
    }

    console.log(`Video found: ${video.id} (${video.title})`);

    if (!video.transcript) {
        console.log('No transcript relation found for this video.');
        return;
    }

    console.log(`Transcript ID: ${video.transcript.id}`);

    // segments is often stored as Json in Prisma. 
    // Depending on the schema, it might be an array or object.
    const segments = video.transcript.segments;

    console.log(`typeof segments: ${typeof segments}`);

    if (Array.isArray(segments)) {
        console.log(`Segments count: ${segments.length}`);
        if (segments.length > 0) {
            console.log('First segment:', JSON.stringify(segments[0], null, 2));
        }
    } else {
        console.log('Segments value:', JSON.stringify(segments, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
