import { AIAgent } from './AIAgent.js';

/**
 * TopicAgent — Specialized NPC for the Education Room
 */
export class TopicAgent extends AIAgent {
    constructor(options = {}) {
        super({
            name: options.name || 'Instructor Sarah',
            shirtColor: 0x333333,
            shirtType: 'jacket',
            hairStyle: 'long',
            hairColor: 0x5d4037,
            dialogueLines: options.dialogueLines || [
                "Welcome to the DJI Education Center!",
                "Today we're looking at the basics of DJI Avata 2.",
                "Did you know the Avata 2 features a 1/1.3-inch CMOS sensor?",
                "This allows for high-dynamic-range imaging even in low light.",
                "Feel free to take a seat and I'll walk you through the safety features."
            ],
            ...options
        });

        this.topic = options.topic || 'General DJI Info';
    }

    // Add specialized logic later for pointing at the whiteboard etc.
}
