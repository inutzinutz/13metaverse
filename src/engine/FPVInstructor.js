import { AIAgent } from './AIAgent.js';

/**
 * FPVInstructor — Specialized NPC for the FPV Arena
 */
export class FPVInstructor extends AIAgent {
    constructor(options = {}) {
        super({
            name: options.name || 'Captain DJI',
            shirtColor: 0xe2001a, // DJI Red
            shirtType: 'jacket',
            hairStyle: 'mohawk',
            hairColor: 0x222222,
            dialogueLines: options.dialogueLines || [
                "Welcome to the FPV Arena! Ready to fly?",
                "Remember to check your battery and signal strength before takeoff.",
                "To perform a 'Power Loop', accelerate upwards and pull back on the pitch stick.",
                "The DJI Avata 2's 'Easy ACRO' mode makes complex flips as simple as one button!",
                "Keep your goggles tight and maintain a clear line of sight."
            ],
            ...options
        });
    }

    // Add specialized flight demonstration logic later
}
